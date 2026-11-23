package com.eventpulse;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ConflictException;
import com.eventpulse.organizations.dto.CreateOrganizationRequest;
import com.eventpulse.organizations.dto.OrganizationDto;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.organizations.service.OrganizationService;
import com.eventpulse.users.model.Role;
import com.eventpulse.users.model.User;
import com.eventpulse.users.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class OrganizerApplicationWorkflowIntegrationTest {

    @Autowired
    private OrganizationService organizationService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    private User createCustomerUser(String emailPrefix) {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        User user = new User(
                emailPrefix + "_" + unique + "@example.com",
                emailPrefix + "_" + unique,
                "hashedpassword",
                "Applicant " + unique,
                Role.CUSTOMER
        );
        user.setActive(true);
        user.setVerified(true);
        return userRepository.save(user);
    }

    private User createAdminUser() {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        User admin = new User(
                "admin_" + unique + "@eventpulse.io",
                "admin_" + unique,
                "hashedpassword",
                "Platform Admin " + unique,
                Role.PLATFORM_ADMIN
        );
        admin.setActive(true);
        admin.setVerified(true);
        return userRepository.save(admin);
    }

    @Test
    @DisplayName("Organizer Application: Customer submits application -> status is PENDING and role remains CUSTOMER")
    void testCustomerSubmitsApplicationSuccess() {
        User applicant = createCustomerUser("applicant");

        CreateOrganizationRequest request = new CreateOrganizationRequest(
                "Apex Productions",
                "contact@apexevents.io",
                "+91 9876543210",
                "ENTERPRISE",
                "Leading electronic music concert promoter in South Asia",
                "https://apexevents.io",
                "https://images.unsplash.com/photo-apex.jpg",
                "instagram.com/apexevents",
                "123 Tech Boulevard, Bengaluru, Karnataka",
                "29ABCDE1234F1Z5",
                "{}",
                "READY",
                "RAZORPAY_ROUTE"
        );

        OrganizationDto result = organizationService.applyForVerification(applicant.getId(), request);

        assertNotNull(result);
        assertEquals("Apex Productions", result.name());
        assertEquals("PENDING", result.verificationStatus());
        assertNull(result.rejectionReason());

        // CRITICAL SECURITY ASSERTION: User must NOT be promoted to ORGANIZER on submit
        User reloadedUser = userRepository.findById(applicant.getId()).orElseThrow();
        assertEquals(Role.CUSTOMER, reloadedUser.getRole(), "User role must remain CUSTOMER while application is PENDING");
    }

    @Test
    @DisplayName("Organizer Application: Submitting duplicate application while PENDING throws ConflictException (409)")
    void testDuplicatePendingApplicationThrowsConflict() {
        User applicant = createCustomerUser("dup_applicant");

        CreateOrganizationRequest request1 = new CreateOrganizationRequest(
                "First Stage Org",
                "first@org.io",
                "+91 9999988888",
                "AGENCY",
                "Live theater",
                null, null, null, null, "29AABC1234D1Z2", null, "READY", "RAZORPAY_ROUTE"
        );

        organizationService.applyForVerification(applicant.getId(), request1);

        CreateOrganizationRequest request2 = new CreateOrganizationRequest(
                "Second Stage Org",
                "second@org.io",
                "+91 9999988888",
                "AGENCY",
                "Duplicate attempt",
                null, null, null, null, "29AABC1234D1Z2", null, "READY", "RAZORPAY_ROUTE"
        );

        assertThrows(ConflictException.class, () -> {
            organizationService.applyForVerification(applicant.getId(), request2);
        }, "Submitting duplicate application when one is PENDING must throw ConflictException");
    }

    @Test
    @DisplayName("Organizer Application: getMyOrganization returns null if no app, and returns applicant's own org when submitted")
    void testGetMyOrganizationIsolation() {
        User userWithoutApp = createCustomerUser("fresh_user");
        assertNull(organizationService.getMyOrganization(userWithoutApp.getId()),
                "User without an application must get null, never another user's org");

        User applicant = createCustomerUser("isolated_applicant");
        CreateOrganizationRequest request = new CreateOrganizationRequest(
                "Solitary Events",
                "solitary@events.io",
                "+91 9123456780",
                "INDEPENDENT",
                "Indie showcases",
                null, null, null, null, "29ABCDE0000F1Z5", null, "READY", "RAZORPAY_ROUTE"
        );
        organizationService.applyForVerification(applicant.getId(), request);

        OrganizationDto myOrg = organizationService.getMyOrganization(applicant.getId());
        assertNotNull(myOrg);
        assertEquals("Solitary Events", myOrg.name());
        assertEquals("PENDING", myOrg.verificationStatus());

        // Fresh user still gets null
        assertNull(organizationService.getMyOrganization(userWithoutApp.getId()));
    }

    @Test
    @DisplayName("Organizer Application: Admin approval promotes applicant to ORGANIZER and sets review audit")
    void testAdminApprovalWorkflow() {
        User applicant = createCustomerUser("approval_applicant");
        User admin = createAdminUser();

        CreateOrganizationRequest request = new CreateOrganizationRequest(
                "SoundWave Live",
                "sound@wave.io",
                "+91 9000011111",
                "ENTERPRISE",
                "Arena tours and festivals",
                "https://soundwave.io",
                null, null, null, "29ABCDE1111F1Z1", null, "READY", "RAZORPAY_ROUTE"
        );
        OrganizationDto submitted = organizationService.applyForVerification(applicant.getId(), request);

        // Admin approves
        OrganizationDto approved = organizationService.approveOrganization(submitted.id(), admin.getId());

        assertEquals("VERIFIED", approved.verificationStatus());
        assertNotNull(approved.reviewedAt());
        assertEquals(admin.getEmail(), approved.reviewedByEmail());

        // CRITICAL ROLE ELEVATION CHECK: Owner is now ORGANIZER
        User promotedUser = userRepository.findById(applicant.getId()).orElseThrow();
        assertEquals(Role.ORGANIZER, promotedUser.getRole(), "User role must be promoted to ORGANIZER upon admin approval");
    }

    @Test
    @DisplayName("Organizer Application: Admin rejection requires a reason and preserves CUSTOMER role")
    void testAdminRejectionRequiresReason() {
        User applicant = createCustomerUser("rejected_applicant");
        User admin = createAdminUser();

        CreateOrganizationRequest request = new CreateOrganizationRequest(
                "Shady Promotions",
                "shady@promotions.io",
                "+91 9111122222",
                "INDEPENDENT",
                "Unregistered promoter",
                null, null, null, null, "INVALIDTAX", null, "READY", "RAZORPAY_ROUTE"
        );
        OrganizationDto submitted = organizationService.applyForVerification(applicant.getId(), request);

        // Blank rejection reason must throw BadRequestException
        assertThrows(BadRequestException.class, () -> {
            organizationService.rejectOrganization(submitted.id(), admin.getId(), "   ");
        });

        // Valid rejection
        OrganizationDto rejected = organizationService.rejectOrganization(
                submitted.id(), admin.getId(), "Tax identification document could not be verified with authorities"
        );

        assertEquals("REJECTED", rejected.verificationStatus());
        assertEquals("Tax identification document could not be verified with authorities", rejected.rejectionReason());
        assertNotNull(rejected.reviewedAt());

        // Role remains CUSTOMER
        User stillCustomer = userRepository.findById(applicant.getId()).orElseThrow();
        assertEquals(Role.CUSTOMER, stillCustomer.getRole());
    }

    @Test
    @DisplayName("Organizer Application: Rejected applicant can resubmit with corrected data -> status resets to PENDING")
    void testResubmissionOfRejectedApplication() {
        User applicant = createCustomerUser("resubmit_applicant");
        User admin = createAdminUser();

        CreateOrganizationRequest initialRequest = new CreateOrganizationRequest(
                "Typo Org",
                "typo@org.io",
                "+91 9222233333",
                "ENTERPRISE",
                "Desc",
                null, null, null, null, "INCORRECT_TAX", null, "READY", "RAZORPAY_ROUTE"
        );
        OrganizationDto submitted = organizationService.applyForVerification(applicant.getId(), initialRequest);
        organizationService.rejectOrganization(submitted.id(), admin.getId(), "Invalid GSTIN format");

        // Resubmit with corrected details via updateOrganization (PUT) or applyForVerification (POST)
        CreateOrganizationRequest correctedRequest = new CreateOrganizationRequest(
                "Corrected Org Name",
                "correct@org.io",
                "+91 9222233333",
                "ENTERPRISE",
                "Corrected description",
                "https://correct.io",
                null, null, null, "29ABCDE9999F1Z9", null, "READY", "RAZORPAY_ROUTE"
        );

        OrganizationDto resubmitted = organizationService.updateOrganization(applicant.getId(), correctedRequest);

        assertEquals("PENDING", resubmitted.verificationStatus(), "Resubmitted application status must be reset to PENDING");
        assertNull(resubmitted.rejectionReason(), "Rejection reason must be cleared upon resubmission");
        assertEquals("Corrected Org Name", resubmitted.name());
    }
}

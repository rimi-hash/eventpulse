package com.eventpulse.venues.service;

import com.eventpulse.common.exception.BadRequestException;
import com.eventpulse.common.exception.ResourceNotFoundException;
import com.eventpulse.organizations.model.Organization;
import com.eventpulse.organizations.repository.OrganizationRepository;
import com.eventpulse.venues.dto.CreateVenueRequest;
import com.eventpulse.venues.dto.VenueDto;
import com.eventpulse.venues.model.Seat;
import com.eventpulse.venues.model.Venue;
import com.eventpulse.venues.model.VenueSection;
import com.eventpulse.venues.repository.SeatRepository;
import com.eventpulse.venues.repository.VenueRepository;
import com.eventpulse.venues.repository.VenueSectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class VenueService {

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private VenueSectionRepository sectionRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private com.eventpulse.inventory.repository.SeatInventoryRepository inventoryRepository;

    @Autowired
    private com.eventpulse.events.repository.TicketTypeRepository ticketTypeRepository;

    @Transactional(readOnly = true)
    public List<VenueDto> getAllVenues() {
        return venueRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public VenueDto getVenueById(UUID id) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + id));
        return toDto(venue);
    }

    @Transactional
    public VenueDto createVenue(UUID userId, CreateVenueRequest request) {
        Organization org = organizationRepository.findFirstByOwnerId(userId).orElse(null);
        if (org == null) {
            List<Organization> all = organizationRepository.findAll();
            if (!all.isEmpty()) org = all.get(0);
        }

        if (org == null) {
            throw new BadRequestException("No organization profile found to associate venue with");
        }

        // Validate layout structure
        validateVenueLayout(request);

        int computedCapacity = 0;
        if (request.sections() != null) {
            for (CreateVenueRequest.CreateSectionRequest secReq : request.sections()) {
                computedCapacity += secReq.capacity() > 0 ? secReq.capacity() : (secReq.seats() != null ? secReq.seats().size() : 0);
            }
        }
        int totalCap = request.totalCapacity() > 0 ? request.totalCapacity() : (computedCapacity > 0 ? computedCapacity : 500);

        String directionsUrl = generateDirectionsUrl(request.name(), request.addressLine1(), request.city(), request.latitude(), request.longitude());

        Venue venue = new Venue(
                org,
                request.name().trim(),
                request.addressLine1().trim(),
                request.city().trim(),
                request.state().trim(),
                request.country().trim(),
                request.postalCode().trim(),
                totalCap,
                request.layoutType() != null ? request.layoutType() : "HYBRID"
        );
        venue.setAddressLine2(request.addressLine2());
        venue.setLatitude(request.latitude());
        venue.setLongitude(request.longitude());
        venue.setDirectionsUrl(directionsUrl);
        venue.setLayoutJson(request.layoutJson());
        venue.setLayoutVersion(request.layoutVersion() != null && request.layoutVersion() > 0 ? request.layoutVersion() : 1);
        venue.setStatus(request.status() != null ? request.status() : "PUBLISHED");
        venue = venueRepository.save(venue);

        if (request.sections() != null && !request.sections().isEmpty()) {
            int displayOrder = 1;
            for (CreateVenueRequest.CreateSectionRequest secReq : request.sections()) {
                int secCap = secReq.capacity() > 0 ? secReq.capacity() : (secReq.seats() != null ? secReq.seats().size() : 100);
                VenueSection section = new VenueSection(
                        venue,
                        secReq.name().trim(),
                        secReq.sectionCode().trim().toUpperCase(),
                        secCap,
                        secReq.isGeneralAdmission(),
                        secReq.displayOrder() > 0 ? secReq.displayOrder() : displayOrder++
                );
                section.setShapeType(secReq.shapeType() != null ? secReq.shapeType() : "RECTANGLE");
                section.setTransformJson(secReq.transformJson());
                section.setPricingTier(secReq.pricingTier() != null ? secReq.pricingTier() : "Standard");
                section.setBasePrice(secReq.basePrice());
                section = sectionRepository.save(section);

                if (!secReq.isGeneralAdmission() && secReq.seats() != null && !secReq.seats().isEmpty()) {
                    List<Seat> seats = new ArrayList<>();
                    for (CreateVenueRequest.CreateSeatRequest seatReq : secReq.seats()) {
                        Seat seat = new Seat(
                                section,
                                seatReq.rowLabel().trim().toUpperCase(),
                                seatReq.seatNumber().trim(),
                                seatReq.gridX(),
                                seatReq.gridY()
                        );
                        seat.setAccessible(seatReq.isAccessible());
                        seat.setCompanion(seatReq.isCompanion());
                        seat.setCoordX(seatReq.coordX());
                        seat.setCoordY(seatReq.coordY());
                        seat.setRotation(seatReq.rotation());
                        seat.setTier(seatReq.tier());
                        seat.setOverridePrice(seatReq.overridePrice());
                        seat.setBlocked(Boolean.TRUE.equals(seatReq.isBlocked()));
                        seat.setRestrictedView(Boolean.TRUE.equals(seatReq.isRestrictedView()));
                        seats.add(seat);
                    }
                    seatRepository.saveAll(seats);
                }
            }
        }

        return toDto(venue);
    }

    @Transactional
    public VenueDto updateVenueLayout(UUID venueId, CreateVenueRequest request, UUID userId) {
        Venue venue = venueRepository.findById(venueId)
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + venueId));

        validateVenueLayout(request);

        int computedCapacity = 0;
        if (request.sections() != null) {
            for (CreateVenueRequest.CreateSectionRequest secReq : request.sections()) {
                computedCapacity += secReq.capacity() > 0 ? secReq.capacity() : (secReq.seats() != null ? secReq.seats().size() : 0);
            }
        }
        int totalCap = request.totalCapacity() > 0 ? request.totalCapacity() : (computedCapacity > 0 ? computedCapacity : venue.getTotalCapacity());

        venue.setName(request.name().trim());
        venue.setAddressLine1(request.addressLine1().trim());
        venue.setAddressLine2(request.addressLine2());
        venue.setCity(request.city().trim());
        venue.setState(request.state().trim());
        venue.setCountry(request.country().trim());
        venue.setPostalCode(request.postalCode().trim());
        venue.setTotalCapacity(totalCap);
        venue.setLayoutType(request.layoutType() != null ? request.layoutType() : venue.getLayoutType());
        venue.setLatitude(request.latitude());
        venue.setLongitude(request.longitude());
        venue.setLayoutJson(request.layoutJson() != null ? request.layoutJson() : venue.getLayoutJson());
        venue.setLayoutVersion(venue.getLayoutVersion() + 1);
        if (request.status() != null) venue.setStatus(request.status());
        venue = venueRepository.save(venue);

        // Remove old sections and seats safely without foreign key conflicts
        List<VenueSection> existingSections = sectionRepository.findByVenueIdOrderByDisplayOrderAsc(venueId);
        List<Seat> allOldSeats = new ArrayList<>();
        List<UUID> oldSeatIds = new ArrayList<>();
        for (VenueSection oldSec : existingSections) {
            List<Seat> oldSeats = seatRepository.findBySectionIdOrderByRowLabelAscSeatNumberAsc(oldSec.getId());
            allOldSeats.addAll(oldSeats);
            for (Seat s : oldSeats) {
                oldSeatIds.add(s.getId());
            }
        }
        if (!oldSeatIds.isEmpty()) {
            inventoryRepository.clearSeatReferences(oldSeatIds);
            seatRepository.deleteAll(allOldSeats);
        }
        if (!existingSections.isEmpty()) {
            List<UUID> oldSectionIds = existingSections.stream().map(VenueSection::getId).toList();
            ticketTypeRepository.clearSectionReferences(oldSectionIds);
            sectionRepository.deleteAll(existingSections);
        }

        // Recreate updated sections and seats
        if (request.sections() != null && !request.sections().isEmpty()) {
            int displayOrder = 1;
            for (CreateVenueRequest.CreateSectionRequest secReq : request.sections()) {
                int secCap = secReq.capacity() > 0 ? secReq.capacity() : (secReq.seats() != null ? secReq.seats().size() : 100);
                VenueSection section = new VenueSection(
                        venue,
                        secReq.name().trim(),
                        secReq.sectionCode().trim().toUpperCase(),
                        secCap,
                        secReq.isGeneralAdmission(),
                        secReq.displayOrder() > 0 ? secReq.displayOrder() : displayOrder++
                );
                section.setShapeType(secReq.shapeType() != null ? secReq.shapeType() : "RECTANGLE");
                section.setTransformJson(secReq.transformJson());
                section.setPricingTier(secReq.pricingTier() != null ? secReq.pricingTier() : "Standard");
                section.setBasePrice(secReq.basePrice());
                section = sectionRepository.save(section);

                if (!secReq.isGeneralAdmission() && secReq.seats() != null && !secReq.seats().isEmpty()) {
                    List<Seat> seats = new ArrayList<>();
                    for (CreateVenueRequest.CreateSeatRequest seatReq : secReq.seats()) {
                        Seat seat = new Seat(
                                section,
                                seatReq.rowLabel().trim().toUpperCase(),
                                seatReq.seatNumber().trim(),
                                seatReq.gridX(),
                                seatReq.gridY()
                        );
                        seat.setAccessible(seatReq.isAccessible());
                        seat.setCompanion(seatReq.isCompanion());
                        seat.setCoordX(seatReq.coordX());
                        seat.setCoordY(seatReq.coordY());
                        seat.setRotation(seatReq.rotation());
                        seat.setTier(seatReq.tier());
                        seat.setOverridePrice(seatReq.overridePrice());
                        seat.setBlocked(Boolean.TRUE.equals(seatReq.isBlocked()));
                        seat.setRestrictedView(Boolean.TRUE.equals(seatReq.isRestrictedView()));
                        seats.add(seat);
                    }
                    seatRepository.saveAll(seats);
                }
            }
        }

        return toDto(venue);
    }

    private void validateVenueLayout(CreateVenueRequest request) {
        if (request.sections() == null || request.sections().isEmpty()) return;

        Set<String> sectionCodes = new HashSet<>();
        for (CreateVenueRequest.CreateSectionRequest sec : request.sections()) {
            String code = sec.sectionCode().trim().toUpperCase();
            if (!sectionCodes.add(code)) {
                throw new BadRequestException("Duplicate section identifier: " + code);
            }

            if (!sec.isGeneralAdmission() && sec.seats() != null) {
                Set<String> seatIdentifiers = new HashSet<>();
                for (CreateVenueRequest.CreateSeatRequest seat : sec.seats()) {
                    String seatKey = seat.rowLabel().trim().toUpperCase() + "-" + seat.seatNumber().trim();
                    if (!seatIdentifiers.add(seatKey)) {
                        throw new BadRequestException("Duplicate seat identifier in section " + code + ": Row " + seat.rowLabel() + " Seat " + seat.seatNumber());
                    }
                }
            }
        }
    }

    private String generateDirectionsUrl(String name, String address, String city, Double lat, Double lng) {
        try {
            if (lat != null && lng != null) {
                return "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
            }
            String query = (name != null ? name + ", " : "") + (address != null ? address + ", " : "") + (city != null ? city : "");
            return "https://www.google.com/maps/search/?api=1&query=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "https://maps.google.com";
        }
    }

    public VenueDto toDto(Venue venue) {
        List<VenueSection> sections = sectionRepository.findByVenueIdOrderByDisplayOrderAsc(venue.getId());
        List<VenueDto.VenueSectionDto> sectionDtos = new ArrayList<>();

        for (VenueSection s : sections) {
            List<VenueDto.SeatDto> seatDtos = Collections.emptyList();
            if (!s.isGeneralAdmission()) {
                List<Seat> seats = seatRepository.findBySectionIdOrderByRowLabelAscSeatNumberAsc(s.getId());
                seatDtos = seats.stream()
                        .map(st -> new VenueDto.SeatDto(
                                st.getId(),
                                s.getId(),
                                st.getRowLabel(),
                                st.getSeatNumber(),
                                st.isAccessible(),
                                st.isCompanion(),
                                st.getGridX(),
                                st.getGridY(),
                                st.getCoordX(),
                                st.getCoordY(),
                                st.getRotation(),
                                st.getTier(),
                                st.getOverridePrice(),
                                st.isBlocked(),
                                st.isRestrictedView()
                        ))
                        .toList();
            }

            sectionDtos.add(new VenueDto.VenueSectionDto(
                    s.getId(),
                    s.getName(),
                    s.getSectionCode(),
                    s.getCapacity(),
                    s.isGeneralAdmission(),
                    s.getDisplayOrder(),
                    s.getShapeType(),
                    s.getTransformJson(),
                    s.getPricingTier(),
                    s.getBasePrice(),
                    seatDtos
            ));
        }

        return new VenueDto(
                venue.getId(),
                venue.getName(),
                venue.getAddressLine1(),
                venue.getAddressLine2(),
                venue.getCity(),
                venue.getState(),
                venue.getCountry(),
                venue.getPostalCode(),
                venue.getTotalCapacity(),
                venue.getLayoutType(),
                venue.getLatitude(),
                venue.getLongitude(),
                venue.getDirectionsUrl(),
                venue.getMapProvider(),
                venue.getLayoutJson(),
                venue.getLayoutVersion(),
                venue.getStatus(),
                sectionDtos
        );
    }
}

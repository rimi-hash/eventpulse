package com.eventpulse.checkin.model;

import com.eventpulse.ticketing.model.Ticket;
import com.eventpulse.users.model.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "checkin_logs")
public class CheckinLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(name = "gate_name", nullable = false, length = 64)
    private String gateName = "Main Gate";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_user_id")
    private User staffUser;

    @Column(name = "scan_timestamp", nullable = false, updatable = false)
    private Instant scanTimestamp = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "scan_result", nullable = false, length = 32)
    private CheckinScanResult scanResult = CheckinScanResult.VALID;

    @Column(name = "device_info", length = 128)
    private String deviceInfo;

    public CheckinLog() {
    }

    public CheckinLog(Ticket ticket, String gateName, User staffUser, CheckinScanResult scanResult, String deviceInfo) {
        this.ticket = ticket;
        this.gateName = gateName;
        this.staffUser = staffUser;
        this.scanResult = scanResult;
        this.deviceInfo = deviceInfo;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public void setTicket(Ticket ticket) {
        this.ticket = ticket;
    }

    public String getGateName() {
        return gateName;
    }

    public void setGateName(String gateName) {
        this.gateName = gateName;
    }

    public User getStaffUser() {
        return staffUser;
    }

    public void setStaffUser(User staffUser) {
        this.staffUser = staffUser;
    }

    public Instant getScanTimestamp() {
        return scanTimestamp;
    }

    public void setScanTimestamp(Instant scanTimestamp) {
        this.scanTimestamp = scanTimestamp;
    }

    public CheckinScanResult getScanResult() {
        return scanResult;
    }

    public void setScanResult(CheckinScanResult scanResult) {
        this.scanResult = scanResult;
    }

    public String getDeviceInfo() {
        return deviceInfo;
    }

    public void setDeviceInfo(String deviceInfo) {
        this.deviceInfo = deviceInfo;
    }
}

package com.careconnect360.doctor.entity;

import java.math.BigDecimal;

import com.careconnect360.auth.entity.User;
import com.careconnect360.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "doctors",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_doctors_user",
            columnNames = "user_id"
        ),
        @UniqueConstraint(
            name = "uk_doctors_license_number",
            columnNames = "license_number"
        )
    }
)
public class Doctor extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_doctors_user")
    )
    private User user;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 100)
    private String specialization;

    @Column(name = "license_number", nullable = false, length = 50)
    private String licenseNumber;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(
        name = "consultation_fee",
        nullable = false,
        precision = 10,
        scale = 2
    )
    private BigDecimal consultationFee;

    @Column(name = "clinic_address", length = 255)
    private String clinicAddress;

    @Column(name = "available_for_appointments", nullable = false)
    private boolean availableForAppointments = true;

    protected Doctor() {
    }

    public Doctor(
            User user,
            String fullName,
            String specialization,
            String licenseNumber,
            String phone,
            BigDecimal consultationFee) {

        this.user = user;
        this.fullName = fullName;
        this.specialization = specialization;
        this.licenseNumber = licenseNumber;
        this.phone = phone;
        this.consultationFee = consultationFee;
    }

    public User getUser() {
        return user;
    }

    public String getFullName() {
        return fullName;
    }

    public String getSpecialization() {
        return specialization;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public String getPhone() {
        return phone;
    }

    public BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public boolean isAvailableForAppointments() {
        return availableForAppointments;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setConsultationFee(BigDecimal consultationFee) {
        this.consultationFee = consultationFee;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }

    public void setAvailableForAppointments(
            boolean availableForAppointments) {

        this.availableForAppointments = availableForAppointments;
    }
}
ALTER TABLE insurance_policies
    ADD COLUMN active_patient_id bigint
        GENERATED ALWAYS AS (
            CASE
                WHEN status = 'ACTIVE' THEN patient_id
                ELSE NULL
            END
        ) STORED,
    ADD UNIQUE INDEX uk_insurance_policies_active_patient
        (active_patient_id);

CREATE INDEX idx_appointments_doctor_status_date_time
    ON appointments (
        doctor_id,
        status,
        appointment_date,
        appointment_time
    );

CREATE INDEX idx_appointments_patient_status_date_time
    ON appointments (
        patient_id,
        status,
        appointment_date,
        appointment_time
    );

CREATE INDEX idx_payments_status_created_at
    ON payments (status, created_at);
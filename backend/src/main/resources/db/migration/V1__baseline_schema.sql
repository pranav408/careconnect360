CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN','DOCTOR','PATIENT') NOT NULL,
  `status` enum('ACTIVE','INACTIVE','LOCKED') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patients` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `full_name` varchar(120) NOT NULL,
  `gender` enum('FEMALE','MALE','OTHER','PREFER_NOT_TO_SAY') DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK9tbsl3fmey0eofbm2xj69v4qs` (`user_id`),
  CONSTRAINT `fk_patients_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctors` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `available_for_appointments` bit(1) NOT NULL,
  `clinic_address` varchar(255) DEFAULT NULL,
  `consultation_fee` decimal(10,2) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `specialization` varchar(100) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doctors_user` (`user_id`),
  UNIQUE KEY `uk_doctors_license_number` (`license_number`),
  CONSTRAINT `fk_doctors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `insurance_policies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `coverage_percentage` decimal(5,2) NOT NULL,
  `deductible_amount` decimal(12,2) NOT NULL,
  `end_date` date NOT NULL,
  `policy_number` varchar(80) NOT NULL,
  `provider_name` varchar(120) NOT NULL,
  `start_date` date NOT NULL,
  `status` enum('ACTIVE','EXPIRED','PENDING','REJECTED') NOT NULL,
  `patient_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_insurance_policy_number` (`policy_number`),
  KEY `fk_insurance_policy_patient` (`patient_id`),
  CONSTRAINT `fk_insurance_policy_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `appointments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time(6) NOT NULL,
  `reason` varchar(500) NOT NULL,
  `status` enum('CANCELLED','COMPLETED','CONFIRMED','REJECTED','REQUESTED') NOT NULL,
  `doctor_id` bigint NOT NULL,
  `patient_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_appointments_doctor` (`doctor_id`),
  KEY `fk_appointments_patient` (`patient_id`),
  CONSTRAINT `fk_appointments_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`),
  CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `claims` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `approved_amount` decimal(12,2) DEFAULT NULL,
  `patient_responsibility` decimal(12,2) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `requested_amount` decimal(12,2) NOT NULL,
  `status` enum('APPROVED','PAID','REJECTED','SUBMITTED','VERIFIED') NOT NULL,
  `appointment_id` bigint NOT NULL,
  `insurance_policy_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_claims_appointment` (`appointment_id`),
  KEY `fk_claims_insurance_policy` (`insurance_policy_id`),
  CONSTRAINT `fk_claims_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`),
  CONSTRAINT `fk_claims_insurance_policy` FOREIGN KEY (`insurance_policy_id`) REFERENCES `insurance_policies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `failure_reason` varchar(500) DEFAULT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `status` enum('FAILED','INITIATED','SUCCESS') NOT NULL,
  `transaction_reference` varchar(100) NOT NULL,
  `claim_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_claim` (`claim_id`),
  UNIQUE KEY `uk_payments_transaction_reference` (`transaction_reference`),
  CONSTRAINT `fk_payments_claim` FOREIGN KEY (`claim_id`) REFERENCES `claims` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `email_delivery_status` enum('FAILED','NOT_REQUESTED','PENDING','SENT') NOT NULL,
  `email_failure_reason` varchar(500) DEFAULT NULL,
  `email_sent_at` datetime(6) DEFAULT NULL,
  `message` varchar(1000) NOT NULL,
  `read_at` datetime(6) DEFAULT NULL,
  `is_read` bit(1) NOT NULL,
  `related_entity_id` bigint DEFAULT NULL,
  `related_entity_type` varchar(50) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `type` enum('APPOINTMENT','APPOINTMENT_CANCELLED','APPOINTMENT_COMPLETED','APPOINTMENT_CONFIRMED','APPOINTMENT_REJECTED','APPOINTMENT_REQUESTED','CLAIM','CLAIM_APPROVED','CLAIM_PAID','CLAIM_REJECTED','CLAIM_SUBMITTED','CLAIM_VERIFIED','INSURANCE_POLICY','PAYMENT','PAYMENT_FAILED','PAYMENT_SUCCESS','SYSTEM') NOT NULL,
  `recipient_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_recipient_read` (`recipient_id`,`is_read`),
  CONSTRAINT `fk_notifications_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
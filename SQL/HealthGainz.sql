-- version 3

CREATE TABLE "user" (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phonenumber TEXT NOT NULL,
    emailaddress TEXT NOT NULL,
	password TEXT NOT NULL,
	roles TEXT ARRAY NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT user_unique_emailaddress UNIQUE (emailaddress),
	CONSTRAINT user_check_role_values CHECK (roles <@ ARRAY['Administrator', 'Therapist', 'StandInTherapist', 'Patient'])
);

CREATE TABLE clinic (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phonenumber TEXT NOT NULL,
    emailaddress TEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT clinic_unique_name UNIQUE (name),
    CONSTRAINT clinic_unique_address UNIQUE (address)
);

CREATE TABLE therapist (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    userid BIGINT NOT NULL,
    clinicid BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT therapist_foreignkey_userid FOREIGN KEY (userid) REFERENCES "user" (id) ON DELETE RESTRICT,
    CONSTRAINT therapist_foreignkey_clinicid FOREIGN KEY (clinicid) REFERENCES clinic (id) ON DELETE CASCADE,
    CONSTRAINT therapist_unique_userid UNIQUE (userid)
);

CREATE TABLE patient (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    userid BIGINT NOT NULL,
    therapistid BIGINT NOT NULL,
    dateofbirth DATE NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT patient_foreignkey_userid FOREIGN KEY (userid) REFERENCES "user" (id) ON DELETE CASCADE,
    CONSTRAINT patient_foreignkey_therapistid FOREIGN KEY (therapistid) REFERENCES therapist (id) ON DELETE RESTRICT,
    CONSTRAINT patient_unique_userid UNIQUE (userid)
);

CREATE TABLE appointment (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    patientid BIGINT NOT NULL,
    datetime TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT appointment_foreignkey_patientid FOREIGN KEY (patientid) REFERENCES patient (id) ON DELETE CASCADE
);

CREATE TABLE video (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    patientid BIGINT NOT NULL,
    title TEXT NOT NULL,
    datetimecreated TIMESTAMP NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT video_foreignkey_patientid FOREIGN KEY (patientid) REFERENCES patient (id) ON DELETE CASCADE
);

CREATE TABLE exercise (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    hold INTEGER NOT NULL,
    videourl TEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT exercise_unique_name UNIQUE (name),
    CONSTRAINT exercise_unique_videourl UNIQUE (videourl),
    CONSTRAINT exercise_check_sets CHECK (sets > 0),
    CONSTRAINT exercise_check_reps CHECK (reps > 0),
    CONSTRAINT exercise_check_hold CHECK (hold >= 0)
);

CREATE TABLE playlist (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT playlist_unique_name UNIQUE (name)
);

CREATE TABLE playlistexercise (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    playlistid BIGINT NOT NULL,
    exerciseid BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT playlistexercise_foreignkey_playlistid FOREIGN KEY (playlistid) REFERENCES playlist (id) ON DELETE CASCADE,
    CONSTRAINT playlistexercise_foreignkey_exerciseid FOREIGN KEY (exerciseid) REFERENCES exercise (id) ON DELETE CASCADE,
    CONSTRAINT playlistexercise_unique_playlistid_exerciseid UNIQUE (playlistid, exerciseid)
);

CREATE TABLE patientplaylist (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    patientid BIGINT NOT NULL,
    playlistid BIGINT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT patientplaylist_foreignkey_patientid FOREIGN KEY (patientid) REFERENCES patient (id) ON DELETE CASCADE,
    CONSTRAINT patientplaylist_foreignkey_playlistid FOREIGN KEY (playlistid) REFERENCES playlist (id) ON DELETE CASCADE,
    CONSTRAINT patientplaylist_unique_patientid_playlistid UNIQUE (patientid, playlistid)
);

INSERT INTO "user" VALUES (DEFAULT, 'Jo Bloggs', '1 Silica Way', '1234', 'jbloggs@abc.com', 'pass', ARRAY['Administrator']);

CREATE TABLE "user" (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phonenumber TEXT NOT NULL,
    emailaddress TEXT NOT NULL,
	password TEXT NOT NULL,
	roles TEXT ARRAY NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (phonenumber),
    UNIQUE (emailaddress),
	CHECK (roles <@ ARRAY['Administrator', 'Therapist', 'Client'])
);

CREATE TABLE clinic (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phonenumber TEXT NOT NULL,
    emailaddress TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name),
    UNIQUE (address)
);

CREATE TABLE therapist (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    userid BIGINT NOT NULL,
    clinicid BIGINT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (userid) REFERENCES "user" (id) ON DELETE RESTRICT,
    FOREIGN KEY (clinicid) REFERENCES clinic (id) ON DELETE CASCADE,
    UNIQUE (userid)
);

CREATE TABLE client (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    userid BIGINT NOT NULL,
    therapistid BIGINT NOT NULL,
    dateofbirth DATE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (userid) REFERENCES "user" (id) ON DELETE CASCADE,
    FOREIGN KEY (therapistid) REFERENCES therapist (id) ON DELETE RESTRICT,
    UNIQUE (userid)
);

CREATE TABLE appointment (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    clientid BIGINT NOT NULL,
    dateandtime TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (clientid) REFERENCES client (id) ON DELETE CASCADE
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
    UNIQUE (name),
    UNIQUE (videourl),
    CHECK (sets > 0),
    CHECK (reps > 0),
    CHECK (hold >= 0)
);

CREATE TABLE playlist (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
);

CREATE TABLE playlistexercise (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    playlistid BIGINT NOT NULL,
    exerciseid BIGINT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (playlistid) REFERENCES playlist (id) ON DELETE CASCADE,
    FOREIGN KEY (exerciseid) REFERENCES exercise (id) ON DELETE CASCADE,
    UNIQUE (playlistid, exerciseid)
);

CREATE TABLE clientplaylist (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    clientid BIGINT NOT NULL,
    playlistid BIGINT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (clientid) REFERENCES client (id) ON DELETE CASCADE,
    FOREIGN KEY (playlistid) REFERENCES playlist (id) ON DELETE CASCADE,
    UNIQUE (clientid, playlistid)
);

INSERT INTO "user" VALUES (DEFAULT, 'Jo Bloggs', '1 Silica Way', '1234', 'jbloggs@abc.com', 'pass', ARRAY['Administrator']);

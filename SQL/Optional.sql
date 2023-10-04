CREATE TABLE video (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (title),
    UNIQUE (url)
);

CREATE TABLE clientvideo (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    clientid BIGINT NOT NULL,
    videoid BIGINT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (clientid) REFERENCES client (id) ON DELETE CASCADE,
    FOREIGN KEY (videoid) REFERENCES video (id) ON DELETE CASCADE,
    UNIQUE (clientid, videoid)
);

.PHONY: install build dev start db-init db-reset clean

install:
	npm install

db-init:
	npm run db:init

db-reset:
	rm -f data.sqlite data.sqlite-shm data.sqlite-wal
	$(MAKE) db-init

build:
	npm run build

dev:
	npm run dev

start: build
	npm run start

clean:
	rm -rf dist

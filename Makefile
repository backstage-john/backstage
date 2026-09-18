.DEFAULT_GOAL := help

.PHONY: help install run build test lint clean

help: ## Show this help
	@echo "Available targets:"
	@echo "  make install   Install dependencies with Yarn"
	@echo "  make run       Install dependencies (if needed) and start the app in development mode"
	@echo "  make build     Build all packages"
	@echo "  make test      Run the test suite"
	@echo "  make lint      Run lint checks"
	@echo "  make clean     Remove build output"

install: ## Install dependencies
	yarn install

run: install ## Start the app (frontend on :3000, backend on :7007)
	yarn start

build: install ## Build all packages
	yarn build:all

test: install ## Run the test suite
	yarn test

lint: install ## Run lint checks
	yarn lint:all

clean: ## Remove build output
	yarn clean

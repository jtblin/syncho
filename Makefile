test:
	mocha --reporter list test/

patch:
	npm version patch

minor:
	npm version minor

major:
	npm version major

release:
	git push
	git push --tags
	npm publish

release-patch: patch release

release-minor: minor release

release-major: major release

.PHONY: test

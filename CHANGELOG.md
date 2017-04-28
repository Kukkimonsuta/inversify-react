# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Added
- Changelog
- Decorators `@provide.singleton` and `@provide.transient` allowing to explicitly set service scope
### Changed
- Moved to `PropTypes` as recommended in [React v15.5.0 Announcement](https://facebook.github.io/react/blog/2017/04/07/react-v15.5.0.html)
- Default behavior of `@provide` has changed to register service as singleton
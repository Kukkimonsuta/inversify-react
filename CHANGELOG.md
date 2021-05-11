# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.0.0] - 2021-05-11

### Changed

 - Reworked for new react context by [Pavel Pevnitskiy](https://github.com/fljot)

## [0.3.0] - 2018-11-07

### Added

- Inversify 5.x support

### Changed

- Updated dependencies and dev tools

## [0.2.0] - 2017-04-28

### Added

- Changelog
- Decorators `@provide.singleton` and `@provide.transient` allowing to explicitly set service scope

### Changed

- Moved to `PropTypes` as recommended in [React v15.5.0 Announcement](https://facebook.github.io/react/blog/2017/04/07/react-v15.5.0.html)
- Default behavior of `@provide` has changed to register service as singleton
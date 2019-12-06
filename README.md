# inversify-react

Components and decorators to connect react with inversify.

**:warning: This library is in an early stage and doesn't have API set in stone. Major changes can happen without warning. :warning:**

## Installation

* `npm install --save react inversify reflect-metadata` (dependencies)
* `npm install --save inversify-react`

## Installation (typescript)

* in `tsconfig.json` set 
```json
"compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["reflect-metadata"]
}
```

## Installation (babel)

https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy

## React component decorators

`@provide`
* creates new container for declaring component and binds given service (using `bind(<type>).toSelf().inSingletonScope()`)
* the new container inherits all services from parent container in the react tree (using `container.parent`)
* requires `reflect-metadata` and `emitDecoratorMetadata`

`@provide.singleton`
* same behaviour as `@provide`

`@provide.transient`
* same behaviour as `@provide` except service is bound in transient scope (`bind(<type>).toSelf().inTransientScope()`)

`@resolve`
* obtains service from container passed down in the react tree, throws if service cannot be obtained
* requires `reflect-metadata` and `emitDecoratorMetadata`

`@resolve(serviceIdentifier)`
* obtains service from container passed down in the react tree, throws if service cannot be obtained

`@resolve.optional`
* obtains service from container passed down in the react tree, returns `undefined` if service cannot be obtained
* requires `reflect-metadata` and `emitDecoratorMetadata`

`@resolve.optional(serviceIdentifier, defaultValue?)`
* obtains service from container passed down in the react tree, returns `defaultValue` if service cannot be obtained

```ts
class RootComponent extends React.Component {
    @provide
    private readonly foo: Foo;

    @provide
    private readonly bar: Bar;

    render() {
        return <div data-foo={this.foo.name} data-bar={this.bar.name}>{this.props.children}</div>;
    }
}

class ChildComponent extends React.Component {
    @resolve
    private readonly foo: Foo;

    @resolve(Bar)
    private readonly bar: any;

    render() {
        return <div>{this.foo.name} {this.bar.name}</div>;
    }
}
```

## Components

`<Provider />`
* takes container and pushes it down the react tree
* sets parent of given container to container passed down in the react tree unless `standalone` is set
* props:
    * `container` - container instance to be used
    * `standalone` - if not falsey, do not set `parent` of given container to the container passed down in react tree

```ts
class RootComponent extends React.Component {
    constructor(props: {}, context: {}) {
        super(props, context);

        this.container = new Container();
        this.container.bind(Foo).toSelf();
        this.container.bind(Bar).toSelf();
    }

    private readonly container: interfaces.Container;

    render() {
        return <Provider container={this.container}><div>{this.props.children}</div></Provider>;
    }
}
```
# inversify-react

Components and decorators to connect react with inversify.

**:warning: This library is in an early stage and doesn't have API set in stone. Major changes can happen without warning. :warning:**

**:warning: Currently only supports TypeScript scenario with decorators and decorator metadata enabled. :warning:**

## Installation

* `npm install --save react inversify reflect-metadata` (dependencies)
* `npm install --save inversify-react`
* in `tsconfig.json` set 
```json
"compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
}
```

## Decorators

`@provide`

* creates new container for declaring component and binds given service (using `bind(<type>).toSelf()`)
* the new container inherits all services from parent container in the react tree (using `container.parent`)

`@resolve`
* obtains service from container passed down in the react tree
* if the same component provides a service, container from current component is used

```ts
class RootComponent extends React.Component<{}, {}> {
    @provide
    private readonly foo: Foo;

    @provide
    private readonly bar: Bar;

    render() {
        return <div data-foo={this.foo.name} data-bar={this.bar.name}>{this.props.children}</div>;
    }
}

class ChildComponent extends React.Component<{}, {}> {
    @resolve
    private readonly foo: Foo;

    render() {
        return <div>{this.foo.name}</div>;
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
class RootComponent extends React.Component<{}, {}> {
    constructor(props: any, context: any) {
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
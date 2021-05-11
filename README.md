# inversify-react

[![npm version](https://badge.fury.io/js/inversify-react.svg)](https://badge.fury.io/js/inversify-react)

![npm peer dependency version](https://img.shields.io/npm/dependency-version/inversify-react/peer/inversify)
![npm peer dependency version](https://img.shields.io/npm/dependency-version/inversify-react/peer/react)

---

Hooks and decorators for [InversifyJS](http://inversify.io) + [React](https://reactjs.org).

---
Table of Contents
* [Motivation](#motivation)
* [Installation](#installation)
* [Usage overview](#usage-overview)
* [Provider](#provider)
* [React hooks](#react-hooks)
    + [useInjection](#useinjection)
    + [useOptionalInjection](#useoptionalinjection)
    + [useContainer](#usecontainer)
    + [useAllInjections](#useallinjections)
* [React component decorators (for classes)](#react-component-decorators--for-classes-)
    + [@resolve](#-resolve)
    + [@resolve.optional](#-resolveoptional)
* [Notes, tips](#notes--tips)


## Motivation

**TL;DR**:
1. InversifyJS, as IoC container, is great for automatic DI
2. use it also in React


## Installation

* `npm install --save inversify-react`
* `yarn add inversify-react`

...on top of your project with other modules already installed and configured
```
react
inversify
reflect-metadata
```

Keep in mind that Inversify uses decorators, which requires some setup for your build process.

Read more about decorators:
* https://github.com/inversify/InversifyJS#installation
* https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy
* https://www.typescriptlang.org/docs/handbook/decorators.html

`inversify-react` also uses decorators, but only when used in Class Components.


## Usage overview

Usage is pretty similar to [React Context](https://reactjs.org/docs/context.html).

1. Wrap React component tree with `Provider` and `Container` from `inversify-react` – just like [React Context.Provider](https://reactjs.org/docs/context.html#contextprovider)
    ```js
    import { Provider } from 'inversify-react';
    ...

    <Provider container={myContainer}>
        ...
    </Provider>
    ```

2. Use dependencies from that container in child components
    ```ts
    import { resolve, useInjection } from 'inversify-react';
    ...

    // In functional component – via hooks
    const ChildComponent: React.FC = () => {
        const foo = useInjection(Foo);
        ...
    };
    
    // or in class component – via decorated fields
    class ChildComponent extends React.Component {
        @resolve
        private readonly foo: Foo;
        ...
    }
    ```

## Provider

```js
<Provider container={myContainer}>
    ...
</Provider>
```

* provides contextual IoC container for children, similar to [React Context.Provider](https://reactjs.org/docs/context.html#contextprovider)
* can automatically establish [hierarchy of containers](https://github.com/inversify/InversifyJS/blob/master/wiki/hierarchical_di.md) in React tree when you use multiple Providers (e.g. in a big modular app)
* props:
    * `container` - container instance or container factory function
    * `standalone` - (optional prop, `false` by default) whether to skip [hierarchy of containers](https://github.com/inversify/InversifyJS/blob/master/wiki/hierarchical_di.md). Could be useful if you already control container hierarchy and would like to ignore React-tree-based hierarchy. 

```ts
import * as React from 'react';
import { Container } from 'inversify';
import { Provider } from 'inversify-react';

// in functional component
const AppOrModuleRoot: React.FC = () => {
    return (
        <Provider container={() => {
            const container = new Container();
            container.bind(Foo).toSelf();
            container.bind(Bar).toSelf();
            return container;
        }}>
            {/*...children...*/}
        </Provider>
    );
};

// or class component
class AppOrModuleRoot extends React.Component {

    // you can create and store container instance explicitly,
    // or use factory function like in functional component example above
    private readonly container = new Container();

    constructor(props: {}, context: {}) {
        super(props, context);

        const { container } = this;
        container.bind(Foo).toSelf();
        container.bind(Bar).toSelf();
    }

    render() {
        return (
            <Provider container={this.container}>
                {/*...children...*/}
            </Provider>
        );
    }
}
```


## React hooks

### useInjection

```ts
const foo = useInjection(Foo);
```
* very similar to [React.useContext](https://reactjs.org/docs/hooks-reference.html#usecontext) hook, resolves dependency by id

### useOptionalInjection

```ts
// e.g. Foo and Bar are not bound
const foo = useOptionalInjection(Foo); // will return undefined
// or
const bar = useOptionalInjection(Bar, () => 'defaultBar'); // will return 'defaultBar'
```
* resolves [optional dependency](https://github.com/inversify/InversifyJS/blob/master/wiki/optional_dependencies.md)
* default value can be defined via lazy resolving function (2nd argument)
    ```ts
    const foo = useOptionalInjection(Foo, () => myDefault);
    // foo === myDefault
    //   ^ Foo | typeof myDefault
    ```
    That function conveniently receives container as argument, so you could instantiate your *default* using container (e.g. if it has dependencies)
    ```ts
    const foo = useOptionalInjection(Foo, container => container.resolve(X));
    ```

### useContainer
  
```ts
const container = useContainer();
// or
const foo = useContainer(container => container.resolve(Foo));
```
* low-level hook, resolves container itself
* has overload with callback to immediately resolve value from container, so could be used for more exotic API, e.g. [named](https://github.com/inversify/InversifyJS/blob/master/wiki/named_bindings.md) or [tagged](https://github.com/inversify/InversifyJS/blob/master/wiki/tagged_bindings.md) bindings

### useAllInjections

```ts
const bars = useAllInjections(Bar);
````
* @see [multi-inject](https://github.com/inversify/InversifyJS/blob/master/wiki/multi_injection.md)

For more examples, please refer to tests: [test/hooks.tsx](./test/hooks.tsx)

## React component decorators (for classes)

### @resolve
```ts
@resolve
foo: Foo;

// or strict and semantic, see tips below
@resolve
private readonly foo!: Foo;
```
* resolves service from container
* requires `reflect-metadata` and `emitDecoratorMetadata`

```ts
// or pass service identifier explicitly
// e.g. if you deal with interfaces and/or don't want to use field type (via reflect-metadata)
@resolve(IFooServiceId)
private readonly foo!: IFoo;
```

### @resolve.optional
```ts
@resolve.optional
private readonly foo?: Foo;
```
* tries to resolve service from container, but returns `undefined` if service cannot be obtained
* requires `reflect-metadata` and `emitDecoratorMetadata`

`@resolve.optional(serviceId, defaultValue?)`
* obtains service from container passed down in the React tree, returns `defaultValue` if service cannot be obtained


```ts
class ChildComponent extends React.Component {
    @resolve
    private readonly foo!: Foo;

    @resolve(Bar)
    private readonly bar!: Bar;

    @resolve.optional(Baz)
    private readonly opt?: Baz;
    
    ...
}

// you can also use dependency in constructor,
// just don't forget to call super with context
// @see https://github.com/facebook/react/issues/13944
constructor(props: {}, context: {}) {
    super(props, context);
    console.log(this.foo.name);
}
```

## Notes, tips
1. \[TypeScript tip\] `private readonly` for `@resolve`-ed fields is not required, but technically it's more accurate, gives better semantics and all.
2. \[TypeScript tip\] `!` for `@resolve`-ed fields is needed for [strictPropertyInitialization](https://www.typescriptlang.org/tsconfig#strictPropertyInitialization) / [strict](https://www.typescriptlang.org/tsconfig#strict) flags (*which are highly recommended*).
3. \[InversifyJS tip\] If you're binding against interface, then it might be more comfortable to collocate service identifier and type. With typed service identifier you get better type inference and less imports. Way better DX compared to using strings as identifiers.

    ```ts
    export interface IFoo {
        // ...
    }
    export namespace IFoo {
        export const $: interfaces.ServiceIdentifier<IFoo> = Symbol('IFoo');
    }
    ```

    ```ts
    container.bind(IFoo.$).to(...);
    //            ^ no need to specify generic type,
    //              type gets inferred from explicit service identifier
    ```

    ```ts
    // in constructor injections (not in React Components, but in services/stores/etc)
    constructor(@inject(IFoo.$) foo: IFoo)

    // in React Class component
    @resolve(IFoo.$)
    private readonly foo!: IFoo; // less imports and less chance of mix-up

    // in functional component
    const foo = useInjection(IFoo.$); // inferred as IFoo
   
    ```

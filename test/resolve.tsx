import * as React from 'react';
import { createContext, useState } from 'react';
import 'reflect-metadata';
import { injectable, Container } from 'inversify';
import * as renderer from 'react-test-renderer';

import { resolve, Provider } from '../src';

@injectable()
class Foo { 
    readonly name: string = 'foo';
}

@injectable()
class ExtendedFoo extends Foo { 
    readonly name: string = 'extendedfoo';
}

@injectable()
class Bar {
    readonly name: string = 'bar';
}

interface RootComponentProps {
    children?: React.ReactNode;
}

const RootComponent: React.FC<RootComponentProps> = ({ children }) => {
    const [container] = useState(() => {
        const c = new Container();
        c.bind(Foo).toSelf();
        c.bind(Bar).toSelf();
        return c;
    });
    return (
        <Provider container={container}>
            <div>{children}</div>
        </Provider>
    );
};

test('resolve using reflect-metadata', () => {
    class ChildComponent extends React.Component {
        @resolve
        private readonly foo: Foo;

        render() {
            return <div>{this.foo.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <RootComponent>
            <ChildComponent />
        </RootComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children).toEqual(['foo']);
});

test('resolve using service identifier (string)', () => {
    const container = new Container();
    container.bind('FooFoo').to(Foo);

    class ChildComponent extends React.Component {
        @resolve('FooFoo')
        private readonly foo: any;

        render() {
            return <div>{this.foo.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo']);
});

test('resolve using service identifier (symbol)', () => {
    const identifier = Symbol();

    const container = new Container();
    container.bind(identifier).to(Foo);

    class ChildComponent extends React.Component {
        @resolve(identifier)
        private readonly foo: any;

        render() {
            return <div>{this.foo.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo']);
});

test('resolve using service identifier (newable)', () => {
    class ChildComponent extends React.Component {
        @resolve(Foo)
        private readonly foo: any;

        render() {
            return <div>{this.foo.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <RootComponent>
            <ChildComponent />
        </RootComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children).toEqual(['foo']);
});

// optional
test('resolve optional using reflect-metadata', () => {
    const container = new Container();
    container.bind(Foo).toSelf();

    class ChildComponent extends React.Component {
        @resolve.optional
        private readonly foo?: Foo;

        @resolve.optional
        private readonly bar?: Bar;

        render() {
            return <div>{this.foo?.name}{this.bar?.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo']);
});

test('resolve optional using service identifier (string)', () => {
    const container = new Container();
    container.bind('FooFoo').to(Foo);

    class ChildComponent extends React.Component {
        @resolve.optional('FooFoo')
        private readonly foo: any;

        @resolve.optional('BarBar')
        private readonly bar: any;

        render() {
            return <div>{this.foo?.name}{this.bar?.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo']);
});

test('resolve optional using service identifier (symbol)', () => {
    const fooIdentifier = Symbol();
    const barIdentifier = Symbol();

    const container = new Container();
    container.bind(fooIdentifier).to(Foo);

    class ChildComponent extends React.Component {
        @resolve.optional(fooIdentifier)
        private readonly foo: any;

        @resolve.optional(barIdentifier)
        private readonly bar: any;

        render() {
            return <div>{this.foo?.name}{this.bar?.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo']);
});

test('resolve optional using service identifier (newable)', () => {
    const container = new Container();
    container.bind(Foo).toSelf();

    class ChildComponent extends React.Component {
        @resolve.optional(Foo)
        private readonly foo: any;

        @resolve.optional(Bar)
        private readonly bar: any;

        render() {
            return <div>{this.foo?.name}{this.bar?.name}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo']);
});

// all
test('resolve all using reflect-metadata [cannot be done, not enough information from typescript]', () => {
    const container = new Container();
    container.bind(Foo).toSelf();
    container.bind(Foo).to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all
        private readonly foo?: Foo[];

        render() {
            return <div>{this.foo?.map(f => f.name)}</div>;
        }
    }

    expect(() => {
        const tree: any = renderer.create(
            <Provider container={container}>
                <ChildComponent />
            </Provider>
        ).toJSON();
    }).toThrowError("No matching bindings found for serviceIdentifier: Array");
});

test('resolve all using service identifier (string)', () => {
    const container = new Container();
    container.bind('FooFoo').to(Foo);
    container.bind('FooFoo').to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all('FooFoo')
        private readonly foo: any[];

        render() {
            return <div>{this.foo?.map(f => f.name)}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo', 'extendedfoo']);
});

test('resolve all using service identifier (symbol)', () => {
    const fooIdentifier = Symbol();

    const container = new Container();
    container.bind(fooIdentifier).to(Foo);
    container.bind(fooIdentifier).to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all(fooIdentifier)
        private readonly foo: any[];

        render() {
            return <div>{this.foo?.map(f => f.name)}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo', 'extendedfoo']);
});

test('resolve all using service identifier (newable)', () => {
    const container = new Container();
    container.bind(Foo).toSelf();
    container.bind(Foo).to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all(Foo)
        private readonly foo: any[];

        render() {
            return <div>{this.foo?.map(f => f.name)}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo', 'extendedfoo']);
});

// optional all
test('resolve optional all using reflect-metadata [cannot be done, not enough information from typescript]', () => {
    const container = new Container();
    container.bind(Foo).toSelf();
    container.bind(Foo).to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all
        private readonly foo?: Foo[];

        @resolve.optional.all
        private readonly bar: Bar[];

        render() {
            return <div>{this.foo?.map(f => f.name)}</div>;
        }
    }

    expect(() => {
        const tree: any = renderer.create(
            <Provider container={container}>
                <ChildComponent />
            </Provider>
        ).toJSON();
    }).toThrowError("No matching bindings found for serviceIdentifier: Array");
});

test('resolve optional all using service identifier (string)', () => {
    const container = new Container();
    container.bind('FooFoo').to(Foo);
    container.bind('FooFoo').to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all('FooFoo')
        private readonly foo: any[];

        @resolve.optional.all('BarBar')
        private readonly bar: any[];

        render() {
            return <div>{this.foo?.map(f => f.name)}{this.bar?.map(f => f.name)}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo', 'extendedfoo']);
});

test('resolve optional all using service identifier (symbol)', () => {
    const fooIdentifier = Symbol();

    const container = new Container();
    container.bind(fooIdentifier).to(Foo);
    container.bind(fooIdentifier).to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all(fooIdentifier)
        private readonly foo: any[];

        @resolve.optional.all(Bar)
        private readonly bar: any[];

        render() {
            return <div>{this.foo?.map(f => f.name)}{this.bar?.map(f => f.name)}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo', 'extendedfoo']);
});

test('resolve optional all using service identifier (newable)', () => {
    const container = new Container();
    container.bind(Foo).toSelf();
    container.bind(Foo).to(ExtendedFoo);

    class ChildComponent extends React.Component {
        @resolve.all(Foo)
        private readonly foo: any[];

        @resolve.optional.all(Bar)
        private readonly bar: any[];

        render() {
            return <div>{this.foo?.map(f => f.name)}{this.bar?.map(f => f.name)}</div>;
        }
    }

    const tree: any = renderer.create(
        <Provider container={container}>
            <ChildComponent />
        </Provider>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children).toEqual(['foo', 'extendedfoo']);
});

describe('limitations', () => {
    test('not possible to use @resolve together with custom contextType', () => {
        // inversify-react uses own React Context to provide IoC container for decorators to work,
        // therefore using static `contextType` is not possible within current implementation.
        //
        // @see https://reactjs.org/docs/context.html#classcontexttype
        //
        // It could be possible to have different implementation, to make it possible for users to use contextType,
        // e.g. via providing container via hidden prop from some HOC,
        // but that would complicate overall solution in both runtime and lib size.
        //
        // Possible workarounds:
        // 1) refactor to functional component – there you can easily use multiple contexts via hooks
        // 2) consume multiple contexts in render via Context.Consumer
        //    https://reactjs.org/docs/context.html#consuming-multiple-contexts
        // 3) pass dependencies or container to component via props
        // ...

        const userlandContext = createContext({});
        userlandContext.displayName = 'userland-context';

        expect(() => {
            class ChildComponent extends React.Component<{}, {}> {
                static contextType = userlandContext;

                @resolve
                private readonly foo: Foo;

                render() {
                    return '-';
                }
            }

            renderer.create(
                <RootComponent>
                    <ChildComponent />
                </RootComponent>
            )
        }).toThrowError('Component `ChildComponent` already has `contextType: userland-context` defined');
    });
});

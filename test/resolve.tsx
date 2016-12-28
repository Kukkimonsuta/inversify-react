import * as React from 'react';
import 'reflect-metadata';
import { injectable, Container } from 'inversify';

import { provide, resolve, Provider } from '../src/index';
import * as renderer from 'react-test-renderer';

@injectable()
class Foo { 
    get name() {
        return 'foo';
    }
}

@injectable()
class Bar {
    get name() {
        return 'bar';
    }
}

class RootComponent extends React.Component<{}, {}> {
    @provide
    private readonly foo: Foo;

    @provide
    private readonly bar: Bar;

    render() {
        return <div data-foo={this.foo.name} data-bar={this.bar.name}>{this.props.children}</div>;
    }
}

test('resolve using reflect metadata', () => {
    class ChildComponent extends React.Component<{}, {}> {
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
    container.bind("FooFoo").to(Foo);

    class ChildComponent extends React.Component<{}, {}> {
        @resolve("FooFoo")
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

    class ChildComponent extends React.Component<{}, {}> {
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
    class ChildComponent extends React.Component<{}, {}> {
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

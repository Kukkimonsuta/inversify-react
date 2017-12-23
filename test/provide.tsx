import * as React from 'react';
import 'reflect-metadata';
import { injectable } from 'inversify';

import { provide, resolve } from '../src/index';
import * as renderer from 'react-test-renderer';

let _uid = 0x1000;
function getUid() { return _uid++; };

@injectable()
class Foo { 
    constructor() {
        this.uid = getUid();
    }

    uid: number;

    get name() {
        return `foo-${this.uid}`;
    }
}

@injectable()
class Bar {
    constructor() {
        this.uid = getUid();
    }

    uid: number;

    get name() {
        return `bar-${this.uid}`;
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

class ChildComponent extends React.Component<{}, {}> {
    @resolve
    private readonly foo: Foo;

    render() {
        return <div>{this.foo.name}</div>;
    }
}

test('decorator provides services to self', () => {
    const tree: any = renderer.create(
        <RootComponent />
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.props['data-foo']).toMatch(/foo-\d+/);
    expect(tree.props['data-bar']).toMatch(/bar-\d+/);
});

test('decorator provides services to immediate children', () => {
    const tree: any = renderer.create(
        <RootComponent>
            <ChildComponent />
        </RootComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children[0]).toMatch(/foo-\d+/);
});

test('decorator provides services to deep children', () => {
    const tree: any = renderer.create(
        <RootComponent>
            <div>
                <ChildComponent />
            </div>
        </RootComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children[0].type).toBe('div');
    expect(tree.children[0].children[0].children[0]).toMatch(/foo-\d+/);
});

test('decorator provides singleton service as default', () => {
    const tree: any = renderer.create(
        <RootComponent>
            <div>
                <ChildComponent />
                <ChildComponent />
            </div>
        </RootComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children[0].type).toBe('div');
    expect(tree.children[0].children[0].children[0]).toMatch(/foo-\d+/);
    expect(tree.children[0].children[1].type).toBe('div');
    expect(tree.children[0].children[1].children[0]).toEqual(tree.children[0].children[0].children[0]);
});

test('decorator provides singleton service when explicitly requested', () => {

    class SingletonProviderComponent extends React.Component<{}, {}> {
        @provide.singleton
        private readonly foo: Foo;

        render() {
            return <div data-foo={this.foo.name}>{this.props.children}</div>;
        }
    }

    const tree: any = renderer.create(
        <SingletonProviderComponent>
            <div>
                <ChildComponent />
                <ChildComponent />
            </div>
        </SingletonProviderComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children[0].type).toBe('div');
    expect(tree.children[0].children[0].children[0]).toMatch(/foo-\d+/);
    expect(tree.children[0].children[1].type).toBe('div');
    expect(tree.children[0].children[1].children[0]).toEqual(tree.children[0].children[0].children[0]);
});

test('decorator provides transient service when explicitly requested', () => {

    class TransientProviderComponent extends React.Component<{}, {}> {
        @provide.transient
        private readonly foo: Foo;

        render() {
            return <div data-foo={this.foo.name}>{this.props.children}</div>;
        }
    }

    const tree: any = renderer.create(
        <TransientProviderComponent>
            <div>
                <ChildComponent />
                <ChildComponent />
            </div>
        </TransientProviderComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children[0].type).toBe('div');
    expect(tree.children[0].children[0].children[0]).toMatch(/foo-\d+/);
    expect(tree.children[0].children[1].type).toBe('div');
    expect(tree.children[0].children[1].children[0]).not.toEqual(tree.children[0].children[0].children[0]);
});
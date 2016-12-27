import * as React from 'react';
import 'reflect-metadata';
import { injectable } from 'inversify';

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

class ChildComponent extends React.Component<{}, {}> {
    @resolve
    private readonly foo: Foo;

    render() {
        return <div>{this.foo.name}</div>;
    }
}

test('decorator provides services to self', () => {
    const tree = renderer.create(
        <RootComponent />
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.props['data-foo']).toEqual('foo');
    expect(tree.props['data-bar']).toEqual('bar');
});

test('decorator provides services to immediate children', () => {
    const tree: any = renderer.create(
        <RootComponent>
            <ChildComponent />
        </RootComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children).toEqual(['foo']);
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
    expect(tree.children[0].children[0].children).toEqual(['foo']);
});

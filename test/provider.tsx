import * as React from 'react';
import 'reflect-metadata';
import { injectable, interfaces, Container } from 'inversify';
import * as renderer from 'react-test-renderer';

import { resolve, Provider } from '../src';

@injectable()
class Foo { 
    readonly name = 'foo';
}

class RootComponent extends React.Component {
    constructor(props: {}, context: {}) {
        super(props, context);

        this.container = new Container();
        this.container.bind(Foo).toSelf();
    }

    private readonly container: interfaces.Container;

    render() {
        return <Provider container={this.container}><div>{this.props.children}</div></Provider>;
    }
}

class ChildComponent extends React.Component {
    @resolve
    private readonly foo: Foo;

    render() {
        return <div>{this.foo.name}</div>;
    }
}

test('provider provides to immediate children', () => {
    const tree: any = renderer.create(
        <RootComponent>
            <ChildComponent />
        </RootComponent>
    ).toJSON();

    expect(tree.type).toBe('div');
    expect(tree.children[0].type).toBe('div');
    expect(tree.children[0].children).toEqual(['foo']);
});

test('provider provides services to deep children', () => {
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
import * as React from 'react';
import { useState } from 'react';
import 'reflect-metadata';
import { injectable, interfaces, Container } from 'inversify';
import * as renderer from 'react-test-renderer';

import { resolve, Provider } from '../src';

@injectable()
class Foo { 
    name = 'foo';
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

describe('hierarchy of containers', () => {
    test('providers make hierarchy of containers by default', () => {
        const outerContainer = new Container();
        outerContainer.bind(Foo).toConstantValue({ name: 'outer' });
        const innerContainer = new Container();

        const tree: any = renderer.create(
            <Provider container={outerContainer}>
                <Provider container={innerContainer}>
                    <ChildComponent />
                </Provider>
            </Provider>
        ).toJSON();

        expect(innerContainer.parent).toBe(outerContainer);
        expect(tree.children).toEqual(['outer']);
    });

    test(`"standalone" provider isolates container`, () => {
        const outerContainer = new Container();
        outerContainer.bind(Foo).toSelf();
        const innerContainer = new Container();

        expect(() => {
            renderer.create(
                <Provider container={outerContainer}>
                    <Provider container={innerContainer} standalone={true}>
                        <ChildComponent />
                    </Provider>
                </Provider>
            ).toJSON();
        }).toThrowError('No matching bindings found for serviceIdentifier: Foo');

        expect(innerContainer.parent).toBeNull();
    });
});

describe('Provider DX', () => {
    // few tests to check/show that Provider component produces DX errors and other minor stuff

    test('"container" prop can be a factory function', () => {
        // simple and uniform approach to define Container for Provider,
        // instead of useState in functional component or field in class component

        // also test that it gets called only once
        const spy = jest.fn();
        let renderCount = 0;
        let forceUpdate = () => {};

        const FunctionalRootComponent: React.FC = () => {
            renderCount++;
            const [s, setS] = useState(true);
            forceUpdate = () => setS(!s);
            return (
                <Provider container={() => {
                    spy();
                    const c = new Container();
                    c.bind(Foo).toSelf();
                    return c;
                }}>
                    <ChildComponent />
                </Provider>
            );
        };

        const tree: any = renderer.create(
            <FunctionalRootComponent>
                <ChildComponent />
            </FunctionalRootComponent>
        ).toJSON();

        expect(renderCount).toBe(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(tree.children).toEqual(['foo']);

        renderer.act(forceUpdate);
        expect(renderCount).toBe(2);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});

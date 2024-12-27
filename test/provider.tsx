import * as React from 'react';
import { useState } from 'react';
import 'reflect-metadata';
import { injectable, interfaces, Container } from 'inversify';
import { render } from '@testing-library/react';

import { resolve, Provider } from '../src';

@injectable()
class Foo { 
    name = 'foo';
}

interface RootComponentProps {
    children?: React.ReactNode;
}

class RootComponent extends React.Component<RootComponentProps> {
    constructor(props: {}) {
        super(props);

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
    const tree = render(
        <RootComponent>
            <ChildComponent />
        </RootComponent>
    );

    const fragment = tree.asFragment();

    expect(fragment.children[0].nodeName).toBe('DIV');
    expect(fragment.children[0].children[0].nodeName).toBe('DIV');
    expect(fragment.children[0].children[0].textContent).toEqual('foo');
});

test('provider provides services to deep children', () => {
    const tree = render(
        <RootComponent>
            <div>
                <ChildComponent />
            </div>
        </RootComponent>
    );

    const fragment = tree.asFragment();

    expect(fragment.children[0].nodeName).toBe('DIV');
    expect(fragment.children[0].children[0].nodeName).toBe('DIV');
    expect(fragment.children[0].children[0].children[0].nodeName).toBe('DIV');
    expect(fragment.children[0].children[0].children[0].textContent).toEqual('foo');
});

describe('hierarchy of containers', () => {
    test('providers make hierarchy of containers by default', () => {
        const outerContainer = new Container();
        outerContainer.bind(Foo).toConstantValue({ name: 'outer' });
        const innerContainer = new Container();

        const tree = render(
            <Provider container={outerContainer}>
                <Provider container={innerContainer}>
                    <ChildComponent />
                </Provider>
            </Provider>
        );

        const fragment = tree.asFragment();

        expect(innerContainer.parent).toBe(outerContainer);
        expect(fragment.children[0].textContent).toEqual('outer');
    });

    test(`"standalone" provider isolates container`, () => {
        const outerContainer = new Container();
        outerContainer.bind(Foo).toSelf();
        const innerContainer = new Container();

        expect(() => {
            render(
                <Provider container={outerContainer}>
                    <Provider container={innerContainer} standalone={true}>
                        <ChildComponent />
                    </Provider>
                </Provider>
            );
        }).toThrow('No matching bindings found for serviceIdentifier: Foo');

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

        const FunctionalRootComponent: React.FC<{ children?: React.ReactNode }> = () => {
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

        const tree = render(
            <FunctionalRootComponent>
                <ChildComponent />
            </FunctionalRootComponent>
        );

        const fragment = tree.asFragment();

        expect(renderCount).toBe(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(fragment.children[0].textContent).toEqual('foo');

        tree.rerender(
            <FunctionalRootComponent>
                <ChildComponent />
            </FunctionalRootComponent>
        );

        expect(renderCount).toBe(2);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});

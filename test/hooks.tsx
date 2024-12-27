import 'reflect-metadata';
import { Container, injectable, interfaces, unmanaged } from 'inversify';
import * as React from 'react';
import { useState } from 'react';
import { assert, IsExact } from 'conditional-type-checks';
import { render } from '@testing-library/react';

import * as hooksModule from '../src/hooks'; // for jest.spyOn
import {
    Provider,
    useAllInjections,
    useContainer,
    useInjection,
    useOptionalInjection,
} from '../src';

// We want to test types around hooks with signature overloads (as it's more complex),
// but don't actually execute them,
// so we wrap test code into a dummy function just for TypeScript compiler
function staticTypecheckOnly(_fn: () => void) {
    return () => {};
}

function throwErr(msg: string): never {
    throw new Error(msg);
}

@injectable()
class Foo {
    readonly name = 'foo';
}

@injectable()
class Bar {
    readonly name: string;

    constructor(@unmanaged() tag: string) {
        this.name = 'bar-' + tag;
    }
}

const aTag = 'a-tag';
const bTag = 'b-tag';
const multiId = Symbol('multi-id');

class OptionalService {
    readonly label = 'OptionalService' as const;
}

interface RootComponentProps {
    children?: React.ReactNode;
}

const RootComponent: React.FC<RootComponentProps> = ({ children }) => {
    const [container] = useState(() => {
        const c = new Container();
        c.bind(Foo).toSelf();
        c.bind(Bar).toDynamicValue(() => new Bar('a')).whenTargetNamed(aTag);
        c.bind(Bar).toDynamicValue(() => new Bar('a')).whenTargetTagged(aTag, 'a');
        c.bind(Bar).toDynamicValue(() => new Bar('b')).whenTargetNamed(bTag);
        c.bind(multiId).toConstantValue('x');
        c.bind(multiId).toConstantValue('y');
        c.bind(multiId).toConstantValue('z');
        return c;
    });
    return (
        <Provider container={container}>
            <div>{children}</div>
        </Provider>
    );
};

describe('useContainer hook', () => {
    const hookSpy = jest.spyOn(hooksModule, 'useContainer');
    const ChildComponent = () => {
        const resolvedContainer = useContainer();
        return <div>{resolvedContainer.id}</div>;
    };

    afterEach(() => {
        hookSpy.mockClear();
    });

    // hook with overloads, so we test types
    test('types', staticTypecheckOnly(() => {
        const container = useContainer();
        assert<IsExact<typeof container, interfaces.Container>>(true);

        const valueResolvedFromContainer = useContainer(c => {
            assert<IsExact<typeof c, interfaces.Container>>(true);
            return c.resolve(Foo);
        });
        assert<IsExact<typeof valueResolvedFromContainer, Foo>>(true);
    }));

    test('resolves container from context', () => {
        const container = new Container();

        const tree = render(
            <Provider container={container}>
                <ChildComponent/>
            </Provider>
        );

        const fragment = tree.asFragment();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(hookSpy).toHaveLastReturnedWith(container);
        expect(fragment.children[0].nodeName).toBe('DIV');
        expect(fragment.children[0].textContent).toEqual(`${container.id}`);
    });

    test('throws when no context found (missing Provider)', () => {
        expect(() => {
            render(<ChildComponent/>);
        }).toThrow('Cannot find Inversify container on React Context. `Provider` component is missing in component tree.');
        // unfortunately currently it produces console.error, but it's only question of aesthetics
        // @see https://github.com/facebook/react/issues/15520

        expect(hookSpy).toHaveBeenCalled(); // looks like React v17 actually calls it 2 times, so we can't expect specific amount
        expect(hookSpy).toHaveReturnedTimes(0);
    });
});

describe('useInjection hook', () => {
    test('resolves using service identifier (newable)', () => {
        const ChildComponent = () => {
            const foo = useInjection(Foo);
            return <div>{foo.name}</div>;
        };

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

    test('resolves using service identifier (string)', () => {
        const container = new Container();
        container.bind('FooFoo').to(Foo);

        const ChildComponent = () => {
            const foo = useInjection<Foo>('FooFoo');
            return <div>{foo.name}</div>;
        };

        const tree = render(
            <Provider container={container}>
                <ChildComponent/>
            </Provider>
        );

        const fragment = tree.asFragment();

        expect(fragment.children[0].nodeName).toBe('DIV');
        expect(fragment.children[0].textContent).toEqual('foo');
    });

    test('resolves using service identifier (symbol)', () => {
        // NB! declaring symbol as explicit ServiceIdentifier of specific type,
        // which gives extra safety through type inference (both when binding and resolving)
        const identifier = Symbol('Foo') as interfaces.ServiceIdentifier<Foo>;

        const container = new Container();
        container.bind(identifier).to(Foo);

        const ChildComponent = () => {
            const foo = useInjection(identifier);
            return <div>{foo.name}</div>;
        };

        const tree = render(
            <Provider container={container}>
                <ChildComponent/>
            </Provider>
        );

        const fragment = tree.asFragment();

        expect(fragment.children[0].nodeName).toBe('DIV');
        expect(fragment.children[0].textContent).toEqual('foo');
    });
});

describe('useOptionalInjection hook', () => {
    const hookSpy = jest.spyOn(hooksModule, 'useOptionalInjection');

    afterEach(() => {
        hookSpy.mockClear();
    });

    // hook with overloads, so we test types
    test('types', staticTypecheckOnly(() => {
        const opt = useOptionalInjection(Foo);
        assert<IsExact<typeof opt, Foo | undefined>>(true);

        const optWithDefault = useOptionalInjection(Foo, () => 'default' as const);
        assert<IsExact<typeof optWithDefault, Foo | 'default'>>(true);
    }));

    test('returns undefined for missing injection/binding', () => {
        const ChildComponent = () => {
            const optionalThing = useOptionalInjection(OptionalService);
            return (
                <>
                    {optionalThing === undefined ? 'missing' : throwErr('unexpected')}
                </>
            );
        };

        const tree = render(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        );

        const fragment = tree.asFragment();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(hookSpy).toHaveReturnedWith(undefined);
        expect(fragment.children[0].textContent).toEqual('missing');
    });

    test('resolves using fallback to default value', () => {
        const defaultThing = {
            label: 'myDefault',
            isMyDefault: true,
        } as const;
        const ChildComponent = () => {
            const defaultFromOptional = useOptionalInjection(OptionalService, () => defaultThing);
            if (defaultFromOptional instanceof OptionalService) {
                throwErr('unexpected');
            } else {
                assert<IsExact<typeof defaultFromOptional, typeof defaultThing>>(true);
                expect(defaultFromOptional).toBe(defaultThing);
            }

            return (
                <>
                    {defaultFromOptional.label}
                </>
            );
        };

        const tree = render(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        );

        const fragment = tree.asFragment();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(hookSpy).toHaveReturnedWith(defaultThing);
        expect(fragment.children[0].textContent).toEqual(defaultThing.label);
    });

    test('resolves if injection/binding exists', () => {
        const ChildComponent = () => {
            const foo = useOptionalInjection(Foo);
            return (
                <>
                    {foo !== undefined ? foo.name : throwErr('Cannot resolve injection for Foo')}
                </>
            );
        };

        const tree = render(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        );

        const fragment = tree.asFragment();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(fragment.children[0].textContent).toEqual('foo');
    });
});

describe('useAllInjections hook', () => {
    const hookSpy = jest.spyOn(hooksModule, 'useAllInjections');

    afterEach(() => {
        hookSpy.mockClear();
    });

    test('resolves all injections', () => {
        const ChildComponent = () => {
            const stuff = useAllInjections(multiId);
            return (
                <>
                    {stuff.join(',')}
                </>
            );
        };

        const tree = render(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        );

        const fragment = tree.asFragment();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(fragment.children[0].textContent).toEqual('x,y,z');
    });
});

import 'reflect-metadata';
import { Container, injectable, interfaces, unmanaged } from 'inversify';
import * as React from 'react';
import { useState } from 'react';
import * as renderer from 'react-test-renderer';
import { assert, IsExact } from 'conditional-type-checks';

import * as hooksModule from '../src/hooks'; // for jest.spyOn
import {
    Provider,
    useAllInjections,
    useContainer,
    useInjection,
    useNamedInjection,
    useOptionalInjection,
    useTaggedInjection,
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

const RootComponent: React.FC = ({ children }) => {
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

        const tree: any = renderer.create(
            <Provider container={container}>
                <ChildComponent/>
            </Provider>
        ).toJSON();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(hookSpy).lastReturnedWith(container);
        expect(tree.type).toBe('div');
        expect(tree.children[0]).toEqual(`${container.id}`);
    });

    test('throws when no context found (missing Provider)', () => {
        expect(() => {
            renderer.create(<ChildComponent/>)
        }).toThrowError('Cannot find Inversify container on React Context. `Provider` component is missing in component tree.');
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

        const tree: any = renderer.create(
            <RootComponent>
                <ChildComponent />
            </RootComponent>
        ).toJSON();

        expect(tree.type).toBe('div');
        expect(tree.children[0].type).toBe('div');
        expect(tree.children[0].children).toEqual(['foo']);
    });

    test('resolves using service identifier (string)', () => {
        const container = new Container();
        container.bind('FooFoo').to(Foo);

        const ChildComponent = () => {
            const foo = useInjection<Foo>('FooFoo');
            return <div>{foo.name}</div>;
        };

        const tree: any = renderer.create(
            <Provider container={container}>
                <ChildComponent/>
            </Provider>
        ).toJSON();

        expect(tree.type).toBe('div');
        expect(tree.children).toEqual(['foo']);
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

        const tree: any = renderer.create(
            <Provider container={container}>
                <ChildComponent/>
            </Provider>
        ).toJSON();

        expect(tree.type).toBe('div');
        expect(tree.children).toEqual(['foo']);
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

        const tree: any = renderer.create(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        ).toJSON();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(hookSpy).toHaveReturnedWith(undefined);
        expect(tree.children).toEqual(['missing']);
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

        const tree: any = renderer.create(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        ).toJSON();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(hookSpy).toHaveReturnedWith(defaultThing);
        expect(tree.children).toEqual([defaultThing.label]);
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

        const tree: any = renderer.create(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        ).toJSON();

        expect(hookSpy).toHaveBeenCalledTimes(1);
        expect(tree.children).toEqual(['foo']);
    });
});

// [useNamedInjection, useTaggedInjection, useAllInjections] together because they're pretty trivial
describe('other hooks', () => {
    const useNamedInjectionSpy = jest.spyOn(hooksModule, 'useNamedInjection');
    const useTaggedInjectionSpy = jest.spyOn(hooksModule, 'useTaggedInjection');
    const useAllInjectionsSpy = jest.spyOn(hooksModule, 'useAllInjections');

    afterEach(() => {
        useNamedInjectionSpy.mockClear();
        useTaggedInjectionSpy.mockClear();
        useAllInjectionsSpy.mockClear();
    });

    test('resolves named, tagged and multi injections', () => {
        const ChildComponent = () => {
            const a = useNamedInjection(Bar, aTag);
            const b = useNamedInjection(Bar, bTag);
            const barA = useTaggedInjection(Bar, aTag, 'a')
            const stuff = useAllInjections(multiId);
            return (
                <>
                    <div>{`${a.name}, ${b.name}`}</div>
                    <div>{barA.name}</div>
                    <div>{stuff.join(',')}</div>
                </>
            );
        };

        const tree: any = renderer.create(
            <RootComponent>
                <ChildComponent/>
            </RootComponent>
        ).toJSON();

        expect(useNamedInjectionSpy).toHaveBeenCalledTimes(2);
        expect(tree.children[0].children).toEqual(['bar-a, bar-b']);

        expect(useTaggedInjectionSpy).toHaveBeenCalledTimes(1);
        expect(tree.children[1].children).toEqual(['bar-a']);

        expect(useAllInjectionsSpy).toHaveBeenCalledTimes(1);
        expect(tree.children[2].children).toEqual(['x,y,z']);
    });
});

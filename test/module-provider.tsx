import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { ModuleProvider, resolve, useInjection } from '../src';
import { render, screen} from '@testing-library/react';
import { ContainerModule } from 'inversify';

test('provider provides children', () => {
    render(
        <ModuleProvider modules={[]}>
            <div data-testid="children" />
        </ModuleProvider>, {});

    expect(screen.queryByTestId('children')).not.toBeNull();
});

test('can access from container', () => {
    const expectedResult = {};

    const module = new ContainerModule((b) => {
        b('test').toDynamicValue(() => expectedResult);
    });

    class CommonComponent extends React.Component {
        @resolve('test')
        private readonly foo: unknown;

        render(): React.ReactNode {
            expect(this.foo).toEqual(expectedResult);
            return null;
        }
    }

    render(
        <ModuleProvider modules={[module]}>
            <CommonComponent />
        </ModuleProvider>, {});
}, 1000);
import { interfaces } from 'inversify';
import * as React from 'react';
import { Component, ComponentClass, useContext } from 'react';
import { Provider } from './provider';
import {
	createProperty,
	ensureAcceptContext,
	AdministrationKey,
	getClassAdministration,
	getInstanceAdministration,
	ServiceDescriptor,
	ProvideBindingScope,
	InversifyReactContext,
} from './internal/utils';

// we could use ES6 WeakMap or Symbols for associating, but we target ES5... see comment in internal/utils
type noWeakMapsWorkaround = any;

interface ProvideDecorator {
	(target: any, name: string, descriptor?: any): any;

	singleton: (target: any, name: string, descriptor?: any) => any;
	transient: (target: any, name: string, descriptor?: any) => any;
}

function findByService(services: ServiceDescriptor[], service: interfaces.ServiceIdentifier<any>) {
	for (const descriptor of services) {
		if (descriptor.service !== service) {
			continue;
		}

		return descriptor;
	}

	return null;
}

function provideImplementation(target: any, name: string, scope?: ProvideBindingScope) {
	if (!Reflect || !Reflect.getMetadata) {
		throw new Error('Decorator `provide` requires `reflect-metadata`');
	}

	const type = Reflect.getMetadata('design:type', target, name);
	if (!type) {
		throw new Error('Failed to discover property type, is `emitDecoratorMetadata` enabled?');
	}

	ensureAcceptContext(target.constructor);
	ensureProvides(target, type, scope);

	if (name === 'render') {
		return Object.getOwnPropertyDescriptor(target, name);
	}

	return createProperty(target, name, type, {});
}

// internal utility component that is used with @provide decorator,
// optionally injects Provider (needed for @provide to work) into React DOM only once in situations with subclassing
const SoftProvider: React.FC<Readonly<{ container: interfaces.Container }>> = ({ container, children }) => {
	const parentContainer = useContext(InversifyReactContext);
	return parentContainer === container
		? (<>{children}</>)
		: (
			<Provider container={container}>
				{children}
			</Provider>
		);
};

function ensureProvides(component: Component, service: interfaces.ServiceIdentifier<unknown>, scope: ProvideBindingScope = 'Singleton') {
	const componentClass = component.constructor as ComponentClass;
	const classAdministration = getClassAdministration(componentClass);

	// provide the service if not already registered
	if (!findByService(classAdministration.services, service)) {
		classAdministration.services.push({ service, scope });
	}

	if (!classAdministration.provides) {
		// TODO:#review: do we really need to guard it? do we need `...Administration.provides` field at all?
		//  same as in `ensureAcceptContext`
		componentClass.contextType = InversifyReactContext;
		classAdministration.provides = true;
	}

	// ensure component's `render` method is decorated with Provider,
	// so child components would have context and would be able to resolve from it
	// TODO:#review: subclassing does not look very elegant – requires to decorate `render` with `@provide`
	const instanceAdministration = getInstanceAdministration(component);
	const renderAdministration: unknown = (component.render as noWeakMapsWorkaround)[AdministrationKey];
	if (!renderAdministration) {
		const originalRender = component.render;
		component.render = function renderWithProvider() {
			return (
				<SoftProvider container={instanceAdministration.container}>
					{originalRender.call(this)}
				</SoftProvider>
			);
		};
		Object.defineProperty(component.render, AdministrationKey, {
			enumerable: false,
			writable: false,
			value: true,
		});
	}
}

const provide: ProvideDecorator = function provide(target: any, name: string, descriptor?: any) {
	return provideImplementation(target, name);
};

provide.singleton = function provideSingleton(target: any, name: string, descriptor?: any) {
	return provideImplementation(target, name, 'Singleton');
};

provide.transient = function provideTransient(target: any, name: string, descriptor?: any) {
	return provideImplementation(target, name, 'Transient');
};

export { ProvideDecorator, provide };
export default provide;

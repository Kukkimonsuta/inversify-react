import { interfaces } from 'inversify';
import * as React from 'react';
import { Component, ComponentClass } from 'react';
import { Provider } from './provider';
import {
	createProperty,
	ensureAcceptContext,
	getClassAdministration,
	getInstanceAdministration,
	ServiceDescriptor,
	ProvideBindingScope,
	InversifyReactContext,
} from './internal/utils';

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

	return createProperty(target, name, type, {});
}

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
	// TODO:#review: subclassing may be hard :/ how much is that needed?
	//  should there be some easy workaround? e.g.
	//  @withProvider
	//  render() { ... }
	const instanceAdministration = getInstanceAdministration(component);
	if (!instanceAdministration.provides) {
		const originalRender = component.render;
		component.render = function renderWithProvider() {
			return (
				<Provider container={instanceAdministration.container}>
					{originalRender.call(this)}
				</Provider>
			);
		};
		instanceAdministration.provides = true;
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

import { ComponentClass, Component } from 'react';
import * as PropTypes from 'prop-types';
import { interfaces, Container } from 'inversify';

const ReactContextKey = 'container';

// Object.defineProperty is used to associate data with objects (component classes and instances)
// #DX: ES6 WeakMap could be used instead in the future when polyfill won't be required anymore
const AdministrationKey = '~$inversify-react';

const requestScope: interfaces.BindingScope = 'Request'; // type-safe and explicit exclusion of one binding scope
// inversify-react does not support 'Request' binding scope, so here's explicit more narrow type
type ProvideBindingScope = Exclude<interfaces.BindingScope, typeof requestScope>;

type ServiceDescriptor = Readonly<{
	scope: ProvideBindingScope;
	service: interfaces.ServiceIdentifier<unknown>;
}>;

// internal data associated with component class
type DiClassAdministration = {
	accepts: boolean;
	provides: boolean;

	services: ServiceDescriptor[];
}

// internal data associated with component instance
type DiInstanceAdministration = {
	container: interfaces.Container;

	properties: { [key: string]: () => unknown };
}

function findByService(services: ServiceDescriptor[], service: interfaces.ServiceIdentifier<unknown>) {
	for (const descriptor of services) {
		if (descriptor.service !== service) {
			continue;
		}

		return descriptor;
	}

	return null;
}

function getClassAdministration(target: any) {
	let administration: DiClassAdministration | undefined = target[AdministrationKey];

	if (!administration) {
		administration = {
			accepts: false,
			provides: false,
			services: [],
		};

		Object.defineProperty(target, AdministrationKey, {
			enumerable: false,
			writable: false,
			value: administration,
		});
	}

	return administration;
}

function getInstanceAdministration(target: any) {
	let administration: DiInstanceAdministration | undefined = target[AdministrationKey];

	if (!administration) {
		let classAdministration: DiClassAdministration = target.constructor[AdministrationKey];

		const parentContainer = (target.context && target.context[ReactContextKey]) as interfaces.Container | null;

		let container: interfaces.Container;
		if (classAdministration.provides) {
			container = new Container();

			for (const service of classAdministration.services) {
				const bindingInWhenOnSyntax = container.bind(service.service)
					.toSelf();

				switch (service.scope) {
					case 'Singleton':
						bindingInWhenOnSyntax.inSingletonScope();
						break;

					case 'Transient':
						bindingInWhenOnSyntax.inTransientScope();
						break;

					default:
						const exhaustive: never = service.scope;
						throw new Error(`Invalid service scope '${service.scope}'`);
				}
			}

			if (parentContainer) {
				container.parent = parentContainer;
			}
		} else {
			if (!parentContainer) {
				throw new Error('Cannot use resolve services without any providers in component tree.');
			}
			container = parentContainer;
		}

		administration = {
			container: container,
			properties: {}
		};

		Object.defineProperty(target, AdministrationKey, {
			enumerable: false,
			writable: false,
			value: administration,
		});
	}

	return administration;
}

function ensureAcceptContext(target: ComponentClass) {
	const administration = getClassAdministration(target);

	if (administration.accepts) {
		// class already accepts react context

		return;
	}

	// accept react context
	if (!target.contextTypes) {
		target.contextTypes = {};
	}

	if (!target.contextTypes[ReactContextKey]) {
		target.contextTypes[ReactContextKey] = PropTypes.object;
	}

	administration.accepts = true;
}

function ensureProvideContext(target: ComponentClass, service: interfaces.ServiceIdentifier<unknown>, scope: ProvideBindingScope = 'Singleton') {
	const administration = getClassAdministration(target);

	// provide the service if not already registered
	if (!findByService(administration.services, service)) {
		administration.services.push({ service, scope });
	}

	if (administration.provides) {
		// class already provides react context
		return;
	}

	// provide react context
	if (!target.childContextTypes) {
		target.childContextTypes = {};
	}

	if (!target.childContextTypes[ReactContextKey]) {
		target.childContextTypes[ReactContextKey] = PropTypes.object.isRequired;
	}

	const originalGetChildContext = target.prototype.getChildContext;
	target.prototype.getChildContext = function getChildContext() {
		let context = originalGetChildContext ? originalGetChildContext.call(this) : {};

		if (!context) {
			context = {};
		}

		context[ReactContextKey] = getContainer(this);

		return context;
	};

	administration.provides = true;
}

function getContainer(target: Component) {
	return getInstanceAdministration(target).container;
}

type PropertyOptions = Readonly<{
	isOptional?: boolean;
	defaultValue?: unknown;
}>;

function createProperty(target: Component, name: string, type: interfaces.ServiceIdentifier<unknown>, options: PropertyOptions) {
	Object.defineProperty(target, name, {
		enumerable: true,
		get() {
			const administration = getInstanceAdministration(this);
			let getter = administration.properties[name];

			if (!getter) {
				const { container } = administration;

				let value: unknown;
				if (options.isOptional)
				{
					if (container.isBound(type)) {
						value = container.get(type);
					} else {
						value = options.defaultValue;
					}
				}
				else
				{
					value = container.get(type);
				}

				getter = administration.properties[name] = () => value;
			}

			return getter();
		}
	});

	const descriptor = Object.getOwnPropertyDescriptor(target, name);
	if (!descriptor)
		throw new Error('Failed to define property');

	return descriptor;
}

export {
	ReactContextKey, AdministrationKey,
	ServiceDescriptor,
	ProvideBindingScope,
	DiClassAdministration, DiInstanceAdministration,
	ensureAcceptContext,
	ensureProvideContext, 
	getContainer, createProperty, PropertyOptions,
	getClassAdministration, getInstanceAdministration, 
};

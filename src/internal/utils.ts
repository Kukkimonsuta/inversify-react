import { ComponentClass, Component } from 'react';
import * as PropTypes from 'prop-types';
import { interfaces, Container } from 'inversify';

const ReactContextKey = "container";
const AdministrationKey = "~$inversify-react";

interface ServiceDescriptor {
	scope: interfaces.BindingScope;
	service: interfaces.ServiceIdentifier<any>;
}

interface DiClassAdministration {
	accepts: boolean;
	provides: boolean;

	services: ServiceDescriptor[];
}

interface DiInstanceAdministration {
	container: interfaces.Container;

	properties: { [key: string]: () => any };
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

function getClassAdministration(target: any) {
	let administration: DiClassAdministration = (target as any)[AdministrationKey];

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
	let administration: DiInstanceAdministration = target[AdministrationKey];

	if (!administration) {
		let classAdministration: DiClassAdministration = target.constructor[AdministrationKey];

		const parentContainer = (target.context && target.context[ReactContextKey]) as interfaces.Container | null;

		let container: interfaces.Container;
		if (classAdministration.provides) {
			container = new Container();

			for (const service of classAdministration.services) {
				const bindingInWhenOnSytax = container.bind(service.service)
					.toSelf();

				switch (service.scope) {
					case 'Singleton':
						bindingInWhenOnSytax.inSingletonScope();
						break;

					case 'Transient':
						bindingInWhenOnSytax.inTransientScope();
						break;

					default:
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

function ensureAcceptContext<P>(target: ComponentClass<P>) {
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

function ensureProvideContext<P, T>(target: ComponentClass<P>, service: interfaces.ServiceIdentifier<T>, scope: interfaces.BindingScope = 'Singleton') {
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

function getContainer<P>(target: Component<P, any>) {
	return getInstanceAdministration(target).container;
}

function createProperty<P>(target: Component<P, any>, name: string, type: interfaces.ServiceIdentifier<any>) {
	Object.defineProperty(target, name, {
		enumerable: true,
		get() {
			const administration = getInstanceAdministration(this);
			let getter = administration.properties[name];

			if (!getter) {
				const value = getContainer(this).get(type);

				getter = administration.properties[name] = () => value;
			}

			return getter();
		}
	});
}

export {
	ReactContextKey, AdministrationKey,
	ServiceDescriptor,
	DiClassAdministration, DiInstanceAdministration,
	ensureAcceptContext,
	ensureProvideContext, 
	getContainer, createProperty,
	getClassAdministration, getInstanceAdministration, 
};

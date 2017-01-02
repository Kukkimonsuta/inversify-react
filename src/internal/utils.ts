import { ComponentClass, Component, PropTypes } from 'react';
import { interfaces, Container } from 'inversify';

const ReactContextKey = "container";
const AdministrationKey = "~$inversify-react";

interface DiClassAdministration {
	accepts: boolean;
	provides: boolean;

	services: interfaces.ServiceIdentifier<any>[];
}

interface DiInstanceAdministration {
	container: interfaces.Container;

	properties: { [key: string]: () => any };
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
				container.bind(service).toSelf();
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

function ensureProvideContext<P, T>(target: ComponentClass<P>, service: interfaces.ServiceIdentifier<T>) {
	const administration = getClassAdministration(target);

	// provide the service if not already registered
	if (administration.services.indexOf(service) === -1) {
		administration.services.push(service);
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
	DiClassAdministration, DiInstanceAdministration,
	ensureAcceptContext,
	ensureProvideContext, 
	getContainer, createProperty,
	getClassAdministration, getInstanceAdministration, 
};

import { interfaces } from 'inversify';
import { ensureAcceptContext, createProperty, PropertyOptions } from './internal';

interface ResolveDecorator {
	(serviceIdentifier: interfaces.ServiceIdentifier<unknown>): (target: any, name: string, descriptor?: any) => any;
	(target: any, name: string, descriptor?: any): any

	optional: ResolveOptionalDecorator;
	all: ResolveAllDecorator;
}

interface ResolveOptionalDecorator {
	<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>, defaultValue?: T): (target: any, name: string, descriptor?: any) => any;
	(target: any, name: string, descriptor?: any): any;
	
	all: ResolveAllDecorator;
}

interface ResolveAllDecorator {
	<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): (target: any, name: string, descriptor?: any) => any;
	(target: any, name: string, descriptor?: any): any;
}

function applyResolveDecorator(target: any, name: string, type: interfaces.ServiceIdentifier<unknown>, options: PropertyOptions) {
	ensureAcceptContext(target.constructor);

	return createProperty(target, name, type, options);
}

function getDesignType(target: any, name: string) {
	if (!name) {
		throw new Error('Decorator `resolve` failed to resolve property name');
	}

	if (!Reflect || !Reflect.getMetadata) {
		throw new Error('Decorator `resolve` without specifying service identifier requires `reflect-metadata`');
	}

	const type = Reflect.getMetadata('design:type', target, name);
	if (!type) {
		throw new Error('Failed to discover property type, is `emitDecoratorMetadata` enabled?');
	}

	return type;
}

const resolve = <ResolveDecorator>function resolve(target: any, name: string, descriptor?: any) {
	if (typeof name !== 'undefined') {
		const type = getDesignType(target, name);

		// decorator
		return applyResolveDecorator(target, name, type, {});
	} else {
		const serviceIdentifier = target as interfaces.ServiceIdentifier<unknown>;
		if (!serviceIdentifier) {
			throw new Error('Invalid property type.');
		}

		// factory
		return function(target: any, name: string, descriptor?: any) {
			return applyResolveDecorator(target, name, serviceIdentifier, {});
		};
	}
};

resolve.optional = <ResolveOptionalDecorator>function resolveOptional<T>(...args: unknown[]) {
	if (typeof args[1] === 'string' && args.length === 3) {
		const [target, name, descriptor] = args;
		const type = getDesignType(target, name);

		// decorator
		return applyResolveDecorator(target, name, type, { isOptional: true });
	} else {
		const serviceIdentifier = args[0] as interfaces.ServiceIdentifier<T>;
		const defaultValue = args[1] as T | undefined;

		// factory
		return function(target: any, name: string, descriptor?: any) {
			return applyResolveDecorator(target, name, serviceIdentifier, { isOptional: true, defaultValue });
		};
	}
}

resolve.all = <ResolveAllDecorator>function resolveAll<T>(...args: unknown[]) {
	if (typeof args[1] === 'string' && args.length === 3) {
		const [target, name, descriptor] = args;
		const type = getDesignType(target, name);

		// decorator
		return applyResolveDecorator(target, name, type, { isAll: true });
	} else {
		const serviceIdentifier = args[0] as interfaces.ServiceIdentifier<T>;

		// factory
		return function(target: any, name: string, descriptor?: any) {
			return applyResolveDecorator(target, name, serviceIdentifier, { isAll: true });
		};
	}
}

resolve.optional.all = <ResolveAllDecorator>function resolveAll<T>(...args: unknown[]) {
	if (typeof args[1] === 'string' && args.length === 3) {
		const [target, name, descriptor] = args;
		const type = getDesignType(target, name);

		// decorator
		return applyResolveDecorator(target, name, type, { isAll: true });
	} else {
		const serviceIdentifier = args[0] as interfaces.ServiceIdentifier<T>;

		// factory
		return function(target: any, name: string, descriptor?: any) {
			return applyResolveDecorator(target, name, serviceIdentifier, { isAll: true, isOptional: true });
		};
	}
}

export { resolve };
export default resolve;

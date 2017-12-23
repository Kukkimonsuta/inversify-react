import { interfaces } from 'inversify';
import { ensureAcceptContext, createProperty } from './internal/utils';

function applyResolveDecorator(target: any, name: string, type: interfaces.ServiceIdentifier<any>) {
	ensureAcceptContext(target.constructor);

	return createProperty(target, name, type);
}

function resolve(serviceIdentifier: interfaces.ServiceIdentifier<any>): (target: any, name: string, descriptor?: any) => any;
function resolve(target: any, name: string, descriptor?: any): any;

function resolve(target: any, name?: string, descriptor?: any) {
	if (name === undefined) {
		const serviceIdentifier = target as interfaces.ServiceIdentifier<any>;
		if (!serviceIdentifier) {
			throw new Error('Invalid property type.');
		}

		// factory
		return function(target: any, name: string, descriptor?: any) {
			return applyResolveDecorator(target, name, serviceIdentifier);
		};
	} else {
		if (!Reflect || !Reflect.getMetadata) {
			throw new Error('Decorator `resolve` without specifying service identifier requires `reflect-metadata`');
		}

		const type = Reflect.getMetadata('design:type', target, name);
		if (!type) {
			throw new Error('Failed to discover property type, is `emitDecoratorMetadata` enabled?');
		}

		// decorator
		return applyResolveDecorator(target, name, type);
	}
}

export { resolve };
export default resolve;

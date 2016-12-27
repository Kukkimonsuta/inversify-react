import { StatelessComponent, ComponentClass, PropTypes } from 'react';
import { ensureAcceptContext, createProperty } from './internal/utils';

function resolve(target: any, name: string, descriptor?: any) {
	const type = Reflect.getMetadata('design:type', target, name);
	if (!type) {
		throw new Error('Failed to discover property type, is `emitDecoratorMetadata` enabled?');
	}

	ensureAcceptContext(target.constructor);

	createProperty(target, name, type);
}

export default resolve;
export { resolve };

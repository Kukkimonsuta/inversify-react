import { ensureAcceptContext, ensureProvideContext, createProperty } from './internal/utils';

function provide(target: any, name: string, descriptor?: any) {
	const type = Reflect.getMetadata('design:type', target, name);
	if (!type) {
		throw new Error('Failed to discover property type, is `emitDecoratorMetadata` enabled?');
	}

	ensureAcceptContext(target.constructor);
	ensureProvideContext(target.constructor, type);

	createProperty(target, name, type);
}

export { provide };
export default provide;

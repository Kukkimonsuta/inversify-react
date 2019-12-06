import { interfaces } from 'inversify';
import { ensureAcceptContext, ensureProvideContext, createProperty } from './internal/utils';

interface ProvideDecorator {
	(target: any, name: string, descriptor?: any): any;

	singleton: (target: any, name: string, descriptor?: any) => any;
	transient: (target: any, name: string, descriptor?: any) => any;
}

function provideImplementation(target: any, name: string, scope?: interfaces.BindingScope) {
	if (!Reflect || !Reflect.getMetadata) {
		throw new Error('Decorator `provide` requires `reflect-metadata`');
	}

	const type = Reflect.getMetadata('design:type', target, name);
	if (!type) {
		throw new Error('Failed to discover property type, is `emitDecoratorMetadata` enabled?');
	}

	ensureAcceptContext(target.constructor);
	ensureProvideContext(target.constructor, type, scope);

	return createProperty(target, name, type, {});
}

const provide = <ProvideDecorator>function provide(target: any, name: string, descriptor?: any) {
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

import * as React from 'react';
import * as PropTypes from 'prop-types';
import { interfaces } from 'inversify';
import { ReactContextKey, getContainer, AdministrationKey, DiInstanceAdministration } from './internal/utils';

interface ProviderProps {
	container: interfaces.Container;
	standalone?: boolean;
}

class Provider extends React.Component<ProviderProps, {}> {

	static contextTypes = {
		[ReactContextKey]: PropTypes.object,
	};

	static childContextTypes = {
		[ReactContextKey]: PropTypes.object.isRequired,
	};

	static defaultProps = {
		standalone: false,
	};

	constructor(props: ProviderProps, context: any) {
		super(props, context);

		const administration: DiInstanceAdministration = {
			container: props.container,
			properties: {}
		};

		if (!props.standalone) {
			const parentContainer = (this.context[ReactContextKey] as interfaces.Container);
			if (parentContainer) {
				administration.container.parent = parentContainer;
			}
		}

		(this as any)[AdministrationKey] = administration;
	}

	getChildContext() {
		return {
			[ReactContextKey]: getContainer(this)
		};
	}

	componentWillReceiveProps(nextProps: ProviderProps) {
		if (nextProps.container !== this.props.container) {
			throw new Error('Swapping container is not supported. Try adding `key={container.guid}` to the `Provider`.');
		}
	}

	render() {
		return React.Children.only(this.props.children);
	}

}

export { ProviderProps, Provider };
export default Provider;

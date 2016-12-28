import { Component, Children, PropTypes } from 'react';
import { interfaces } from 'inversify';
import { ReactContextKey, getContainer, AdministrationKey, DiInstanceAdministration } from './internal/utils';

interface ProviderProps {
	container: interfaces.Container;
	standalone?: boolean;
}

class Provider extends Component<ProviderProps, {}> {

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
			throw new Error('Swapping container is not supported');
		}
	}

	render() {
		return Children.only(this.props.children);
	}

}

export { ProviderProps, Provider };
export default Provider;

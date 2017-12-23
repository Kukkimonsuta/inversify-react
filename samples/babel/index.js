import 'reflect-metadata';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { injectable, Container } from 'inversify';
import { resolve, Provider } from '../../dist';

@injectable()
class FooService {
    bar() {
        return "world";
    }
}

class TestComponent extends React.Component {
    @resolve(FooService)
    service;
 
    render() {
        return <div>Hello {this.service.bar()}!</div>;
    }
 }

const container = new Container();
container.bind(FooService).toSelf().inSingletonScope();

ReactDOM.render(<Provider container={container}>
    <div>
        <TestComponent />
    </div>
</Provider>, document.getElementById('app'));
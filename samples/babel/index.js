import 'reflect-metadata';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { injectable, Container } from 'inversify';
import { resolve, Provider } from '../../dist';

@injectable()
class FooService {
    status() {
        return "Hello from FooService";
    }
}

@injectable()
class BarService {
    status() {
        return "Hello from BarService";
    }
}

class TestComponent extends React.Component {
    @resolve(FooService)
    fooService;

    @resolve.optional(BarService)
    barService;
 
    render() {
        return <div>
            Hello word!
            <ul>
                <li>{this.fooService ? this.fooService.status() : 'FooService was not resolved'}</li>
                <li>{this.barService ? this.barService.status() : 'BarService was not resolved'}</li>
            </ul>
        </div>;
    }
 }

const container = new Container();
container.bind(FooService).toSelf().inSingletonScope();

ReactDOM.render(<Provider container={container}>
    <div>
        <TestComponent />
    </div>
</Provider>, document.getElementById('app'));
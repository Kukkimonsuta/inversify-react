import * as React from 'react';
import { useEffect, useState } from 'react';
import Provider, { type ProviderProps }  from './provider';
import { type interfaces, Container } from 'inversify';

type ModuleProviderProps = Readonly<Omit<ProviderProps, 'container'> & {
    modules: interfaces.ContainerModule[],
    containerOpts?: interfaces.ContainerOptions,
}>;

const ModuleProvider: React.FC<ModuleProviderProps> = ({
    modules,
    containerOpts,
    ...props
}) => {
    const [container, setContainer] = useState<interfaces.Container>();

    useEffect(() => {
        const container = new Container(containerOpts);

        container.load(...modules);
        
        setContainer(container);

        return () => {
            container.unload(...modules);
        }
    }, modules);

    if (!container) return null;
    
    return <Provider {...props} container={container} />;
}

export { ModuleProviderProps, ModuleProvider };
export default ModuleProvider;
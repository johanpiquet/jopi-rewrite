function patchRoutes(routes) {
    function doPatch(routes) {
        for (let route of routes) {
            if (route.Component) {
                const routePath = route.Component;
                const C = jopiHydrate.components[routePath];
                const myKey = routePath;

                route.Component = () => {
                    return <Page key={myKey}><C/></Page>;
                }
            }

            if (route.children) {
                doPatch(route.children);
            }
        }
    }

    doPatch(routes);
    return routes;
}

const gRoutes = patchRoutes(
    //[ROUTES]
)

gHydrateAllHook = function() {
    let root = document.body;
    const router = createBrowserRouter(gRoutes);

    ReactDOM.createRoot(root).render(
        <RouterProvider router={router} />
    );
}
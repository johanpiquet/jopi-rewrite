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
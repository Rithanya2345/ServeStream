import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * Layout
 * Main app shell with sidebar and content area.
 */
const Layout = () => {
    return (
        <div className="flex min-h-screen bg-surface-950">
            <Sidebar />
            <main className="flex-1 ml-64 p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;

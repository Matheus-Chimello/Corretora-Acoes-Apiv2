import React from 'react';
import ListaCorretoras from '../components/ListaCorretoras';
import Navbar from '../components/Navbar';

export default function Corretoras() {
    return (
        <div className="container">
            <Navbar title="Corretoras" />
            <main className="page-content">
                <ListaCorretoras />
            </main>
        </div>
    );
}

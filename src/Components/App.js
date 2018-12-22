import React, { Component } from 'react';
import '../assets/scss/App.scss';
import SlateEditor from './Editor';

class App extends Component {
    render() {
        return (
            <div className="App">
                <SlateEditor />
            </div>
        );
    }
}

export default App;

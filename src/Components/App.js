import React, { Component } from 'react';
import '../assets/scss/App.scss';
import SlateEditor from './Editor/Editor';
import Header from './Common/Header';

class App extends Component {
    render() {
        return (
            <div className="App">
                <Header />
                <div className="container pt-5">
                    <div className="row">
                        <div className="col-8 mx-auto border rounded">
                            <SlateEditor />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default App;

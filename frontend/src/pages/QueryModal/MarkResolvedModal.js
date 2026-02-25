import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Label } from 'reactstrap';

const MarkResolvedModal = ({ isOpen, toggle, onSubmit }) => {
    const [note, setNote] = useState('');

    const handleSubmit = () => {
        onSubmit(note);
        setNote('');
        toggle();
    };


    return (
        <Modal isOpen={isOpen} toggle={toggle}>
            <ModalHeader toggle={toggle}>Mark as Resolved</ModalHeader>
            <ModalBody>
                <Label for="resolveNote">Note (optional)</Label>
                <Input
                    id="resolveNote"
                    type="textarea"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add any details you'd like to include with the resolution..."
                />
            </ModalBody>
            <ModalFooter>
                <Button color="success"
                    style={{ fontSize: "12px" }}
                    onClick={handleSubmit}>
                    Submit
                </Button>{' '}
                <Button color="secondary" onClick={toggle}>
                    Cancel
                </Button>
            </ModalFooter>
        </Modal>
    );
};

MarkResolvedModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    toggle: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
};

export default MarkResolvedModal;

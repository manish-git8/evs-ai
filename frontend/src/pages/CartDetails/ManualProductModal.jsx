import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Label,
} from 'reactstrap';
import { useState, useEffect } from 'react';

const ManualProductModal = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}) => {

    const safeData = initialData || {};

    const [form, setForm] = useState({
        partId: '',
        description: '',
        price: '',
        unitOfMeasure: 'Each',
        saveToInternalCatalog: true, // Default to true
    });
    useEffect(() => {
        if (!isOpen) return;

        if (safeData.isNewManual) {
            setForm({
                partId: safeData.partId ?? '',
                description: '',
                price: '',
                unitOfMeasure: safeData.unitOfMeasure ?? 'Each',
                saveToInternalCatalog: true,
            });
            return;
        }

        setForm({
            partId: safeData.partId ?? '',
            description: '',
            price:  '',
            unitOfMeasure: safeData.unitOfMeasure ?? 'Each',
            saveToInternalCatalog: true,
        });
    }, [safeData, isOpen]);


    const isValid =
        form.description.trim() !== '' &&
        Number(form.price) > 0 &&
        (form.saveToInternalCatalog || form.partId.trim() !== '');

    return (
        <Modal isOpen={isOpen} toggle={onClose} centered backdrop="static">
            <ModalHeader toggle={onClose}>
                Enter Product Details
            </ModalHeader>

            <ModalBody>
                {!form.saveToInternalCatalog && (
                    <div className="mb-3">
                        <Label>
                            Part ID <span className="text-danger">*</span>
                        </Label>
                        <Input
                            value={form.partId}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    partId: e.target.value,
                                }))
                            }
                            placeholder="Enter Part ID"
                        />
                    </div>
                )}
                {form.saveToInternalCatalog && (
                    <div className="mb-3">
                        <div className="alert alert-info py-2" style={{ fontSize: '12px' }}>
                            <i className="bi bi-info-circle me-1"></i>
                            Part ID will be auto-generated when saved to internal catalog
                        </div>
                    </div>
                )}

                <div className="mb-3">
                    <Label>
                        Description <span className="text-danger">*</span>
                    </Label>
                    <Input
                        value={form.description}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                description: e.target.value,
                            }))
                        }
                    />
                </div>

                <div className="mb-3">
                    <Label>
                        Unit Price <span className="text-danger">*</span>
                    </Label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                price: e.target.value,
                            }))
                        }
                    />
                </div>

                <div className="mb-3">
                    <Label>Unit of Measure</Label>
                    <Input
                        type="select"
                        class="form-select"
                        value={form.unitOfMeasure}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                unitOfMeasure: e.target.value,
                            }))
                        }
                    >
                        {[
                            'Each',
                            'Piece',
                            'Set',
                            'Box',
                            'Pack',
                            'Case',
                            'Roll',
                            'Meter',
                            'Liter',
                            'Kg',
                        ].map((uom) => (
                            <option key={uom} value={uom}>
                                {uom}
                            </option>
                        ))}
                    </Input>
                </div>

                <div className="mb-3">
                    <div className="form-check">
                        <Input
                            type="checkbox"
                            className="form-check-input"
                            id="saveToInternalCatalog"
                            checked={form.saveToInternalCatalog}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    saveToInternalCatalog: e.target.checked,
                                }))
                            }
                        />
                        <Label className="form-check-label" for="saveToInternalCatalog">
                            Save to Internal Catalog
                        </Label>
                    </div>
                    <small className="text-muted">
                        {form.saveToInternalCatalog
                            ? 'A new Part ID will be auto-generated and saved to your internal catalog'
                            : 'This product will only be added to the cart without saving to catalog'}
                    </small>
                </div>
            </ModalBody>

            <ModalFooter>
                <Button color="secondary" onClick={onClose}>
                    Close
                </Button>
                <Button
                    color="primary"
                    disabled={!isValid}
                    onClick={() => onSave({
                        ...form,
                        cartDetailId: safeData.cartDetailId,
                        saveToInternalCatalog: form.saveToInternalCatalog,
                    })}
                >
                    Save
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ManualProductModal;

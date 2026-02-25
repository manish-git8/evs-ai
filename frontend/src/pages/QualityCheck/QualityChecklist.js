import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Container,
  Card,
  CardBody,
  CardHeader,
  Collapse,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
} from "reactstrap";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

const QualityChecklist = () => {
  const [mainChecks, setMainChecks] = useState([
    {
      id: 1,
      name: "Main Check 1",
      subChecks: [
        { id: 1, name: "Sub Check 1.1", priority: 1, checked: false },
        { id: 2, name: "Sub Check 1.2", priority: 2, checked: false },
      ],
    },
    {
      id: 2,
      name: "Main Check 2",
      subChecks: [],
    },
  ]);

  const [openCheck, setOpenCheck] = useState(null);

  const handleMainCheckToggle = (mainId) => {
    setMainChecks((prev) =>
      prev.map((main) =>
        main.id === mainId ? { ...main, checked: !main.checked } : main
      )
    );
  };

  const handleSubCheckToggle = (mainId, subId) => {
    setMainChecks((prev) =>
      prev.map((main) =>
        main.id === mainId
          ? {
              ...main,
              subChecks: main.subChecks.map((sub) =>
                sub.id === subId
                  ? { ...sub, checked: !sub.checked }
                  : sub
              ),
            }
          : main
      )
    );
  };

  const handleAddSubCheck = (mainId, subCheckName, priority) => {
    setMainChecks((prev) =>
      prev.map((main) =>
        main.id === mainId
          ? {
              ...main,
              subChecks: [
                ...main.subChecks,
                {
                  id: Date.now(),
                  name: subCheckName,
                  priority,
                  checked: false,
                },
              ],
            }
          : main
      )
    );
  };

  const toggleSubChecks = (mainId) => {
    setOpenCheck((prev) => (prev === mainId ? null : mainId));
  };

  return (
    <Container>
      <h1 className="my-4">Quality Checklist</h1>
      {mainChecks.map((main) => (
        <Card className="mb-3" key={main.id}>
          <CardHeader
            className="d-flex justify-content-between align-items-center"
            onClick={() => toggleSubChecks(main.id)}
            style={{ cursor: "pointer" }}
          >
            <FormGroup check>
              <Label check htmlFor={`main-check-${main.id}`}>
                <Input
                  id={`main-check-${main.id}`}
                  type="checkbox"
                  checked={main.checked || false}
                  onChange={() => handleMainCheckToggle(main.id)}
                />
                {main.name}
              </Label>
            </FormGroup>
            {openCheck === main.id ? <FaChevronDown /> : <FaChevronRight />}
          </CardHeader>
          <Collapse isOpen={openCheck === main.id}>
            <CardBody>
              {main.subChecks.length > 0 ? (
                main.subChecks
                  .sort((a, b) => a.priority - b.priority)
                  .map((sub) => (
                    <FormGroup check key={sub.id} className="ms-4">
                      <Label check htmlFor={`sub-check-${main.id}-${sub.id}`}>
                        <Input
                          id={`sub-check-${main.id}-${sub.id}`}
                          type="checkbox"
                          checked={sub.checked}
                          onChange={() => handleSubCheckToggle(main.id, sub.id)}
                        />
                        {sub.name} (Priority: {sub.priority})
                      </Label>
                    </FormGroup>
                  ))
              ) : (
                <p className="ms-4">No sub-checks available.</p>
              )}
              <AddSubCheckForm
                onAdd={(name, priority) =>
                  handleAddSubCheck(main.id, name, priority)
                }
              />
            </CardBody>
          </Collapse>
        </Card>
      ))}
    </Container>
  );
};

const AddSubCheckForm = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && priority > 0) {
      onAdd(name, priority);
      setName("");
      setPriority(1);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="mt-3 ms-4">
      <FormGroup>
        <Label for="sub-check-name">Name</Label>
        <Input
          id="sub-check-name"
          type="text"
          placeholder="Sub-check name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label for="sub-check-priority">Priority</Label>
        <Input
          id="sub-check-priority"
          type="number"
          min="1"
          placeholder="Priority"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          required
        />
      </FormGroup>
      <Button type="submit" color="primary">
        Add Sub-Check
      </Button>
    </Form>
  );
};

AddSubCheckForm.propTypes = {
  onAdd: PropTypes.func.isRequired,
};

export default QualityChecklist;

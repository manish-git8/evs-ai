import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { FaPaperclip, FaDownload } from 'react-icons/fa';

const AttachmentsModal = ({ attachments, isOpen, toggle, onDownload }) => {
  return (
    <Modal isOpen={isOpen} toggle={toggle}>
      <ModalHeader toggle={toggle}>
        <FaPaperclip className="me-2" />
        Attachments ({attachments.length})
      </ModalHeader>
      <ModalBody style={{ maxHeight: '60vh', overflow: 'auto' }}>
        <div className="list-group">
          {attachments.map((att) => (
            <div
              key={att.attachmentId || att.file?.fileId}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <FaPaperclip className="me-2 text-muted" />
                <span className="fw-semibold">
                  {att.file?.fileName || att.fileName || `File ${att.fileId || att.file?.fileId}`}
                </span>
              </div>
              <Button
                color="primary"
                size="sm"
                onClick={() =>
                  onDownload(att.fileId || att.file?.fileId, att.file?.fileName || att.fileName)
                }
                className="ms-3"
              >
                <FaDownload className="me-1" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

AttachmentsModal.propTypes = {
  attachments: PropTypes.arrayOf(
    PropTypes.shape({
      attachmentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      fileId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      file: PropTypes.shape({
        fileId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        fileName: PropTypes.string,
      }),
      fileName: PropTypes.string,
    }),
  ).isRequired,
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default AttachmentsModal;

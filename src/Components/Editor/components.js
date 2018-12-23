import React from 'react';
import styled from '@emotion/styled';

export const Button = styled('span')`
  cursor: pointer;
  color: ${props => (props.reversed
        ? props.active ? 'white' : '#0078FF'
        : props.active ? '#00E89D' : 'white')};
`;

export const Icon = styled(({ className, ...rest }) => <span className={`material-icons ${className}`} {...rest} />)`
  font-size: 18px;
  vertical-align: text-bottom;
`;

export const Menu = styled('div')`
  & > * {
    display: inline-block;
  }

  & > * + * {
    margin-left: 15px;
  }
`;

export const Toolbar = styled(Menu)`
  position: relative;
  padding: 10px 18px;
  margin: 0px -15px;
  margin-bottom: 20px;
  background-color: #3C4858;
  border-radius: 0.25rem !important;
`;

export const Image = styled('img')`
display: block;
max-width: 100%;
max-height: 20em;
box-shadow: ${props => (props.selected ? '0 0 0 2px blue;' : 'none')};
`;

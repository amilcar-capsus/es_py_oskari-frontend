import React from 'react';
import PropTypes from 'prop-types';
import { shapes } from './propTypes';
import styled from 'styled-components';
import { Tabs, TabPane } from 'oskari-ui';
import { Mutator } from 'oskari-ui/util';
import { LayerList } from './LayerList/';
import { SelectedLayers, SelectedTab } from './SelectedLayers/';
import { TABS_ALL_LAYERS, TABS_SELECTED_LAYERS } from '.';

const StyledTabs = styled(Tabs)`
    max-width: 600px;
`;

const ControlledTabs = ({ tab, ...rest }) => {
    if (tab) {
        return <StyledTabs activeKey={tab} {...rest} />;
    }
    return <StyledTabs defaultActiveKey={TABS_ALL_LAYERS} {...rest} />;
};
ControlledTabs.propTypes = {
    tab: PropTypes.string
};

export const LayerViewTabs = ({ tab, layerList, mutator, locale }) => {
    const layers = Oskari.getSandbox().findAllSelectedMapLayers();
    const numLayers = layers.length;
    const { tabs } = locale;
    return (
        <ControlledTabs tabPosition='top' tab={tab} onChange={mutator.setTab}>
            <TabPane tab={tabs.layerList} key={TABS_ALL_LAYERS}>
                <LayerList {...layerList.state} mutator={layerList.mutator} locale={locale} />
            </TabPane>
            <TabPane tab={<SelectedTab num={numLayers} text={tabs.selectedLayers} />} key={TABS_SELECTED_LAYERS}>
                <SelectedLayers layers={layers} />
            </TabPane>
        </ControlledTabs>
    );
};

LayerViewTabs.propTypes = {
    layerList: shapes.stateful.isRequired,
    tab: PropTypes.string,
    mutator: PropTypes.instanceOf(Mutator).isRequired,
    locale: PropTypes.shape({ tabs: PropTypes.object }).isRequired
};
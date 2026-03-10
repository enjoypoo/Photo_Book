import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants';
import { TAB_BAR_HEIGHT } from '../../App';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 배경 그라디언트 */}
      <LinearGradient
        colors={[COLORS.bgPink, COLORS.bgPurple, COLORS.bgBlue]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 헤더 */}
      <LinearGradient
        colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle}>개인정보처리방침</Text>
          <Text style={styles.headerSub}>시행일: 2026년 3월 8일</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: TAB_BAR_HEIGHT + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 서문 */}
        <View style={styles.introCard}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.introGradient}
          >
            <View style={styles.introRow}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.introTitle}>SNAPTAIL은 이용자의 개인정보를 소중히 여깁니다</Text>
            </View>
            <Text style={styles.introText}>
              본 앱은 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 및 관련 법령을 준수하며,
              이용자의 모든 데이터를 기기 내부에서만 처리합니다.
            </Text>
          </LinearGradient>
        </View>

        {/* 제1조 */}
        <Section title="제1조 (개인정보처리방침의 목적 및 적용 범위)">
          <BodyText>
            SNAPTAIL(이하 "앱")은 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 및 기타 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위하여 본 방침을 수립하였습니다.{'\n\n'}
            본 방침은 SNAPTAIL 앱을 통해 처리되는 모든 개인정보에 적용됩니다.
          </BodyText>
        </Section>

        {/* 제2조 */}
        <Section title="제2조 (처리하는 개인정보의 항목)">
          <BodyText>
            본 앱은 <BoldText>이용자의 기기 내부(로컬)에서만 동작</BoldText>하며, 운영자 서버 또는 클라우드로 개인정보를 전송·저장하지 않습니다.
          </BodyText>
          <TableBlock
            headers={['항목', '처리 목적', '보유 위치']}
            rows={[
              ['사진·이미지 파일', '포토북 앨범 생성 및 PDF 제작', '기기 내부 저장소만'],
              ['사진 촬영 데이터', '앱 내 카메라 기능', '기기 내부 저장소만'],
              ['EXIF 메타데이터\n(촬영일시, 기기 정보, GPS 위치 좌표 포함 가능)', '사진 정렬, 촬영 정보 표시', '기기 내부 처리만'],
              ['앨범·그룹 구성 정보', '포토북 레이아웃 관리', '기기 내부 저장소만\n(AsyncStorage)'],
              ['앱 설정 데이터', '사용자 설정 보존', '기기 내부 저장소만\n(AsyncStorage)'],
            ]}
          />
        </Section>

        {/* 제3조 */}
        <Section title="제3조 (개인정보의 처리 목적)">
          <BodyText>본 앱은 다음 목적으로만 개인정보를 처리합니다.</BodyText>
          <NumberedList items={[
            '포토북 서비스 제공: 사진 앨범 구성, 레이아웃 적용, PDF 파일 생성',
            '앱 기능 운영: 사진 촬영, 갤러리 접근, 앨범 관리',
            '사용자 설정 유지: 앱 내 설정 및 구성 정보 보존',
          ]} />
        </Section>

        {/* 제4조 */}
        <Section title="제4조 (개인정보의 처리 및 보유 기간)">
          <TableBlock
            headers={['구분', '보유 기간', '삭제 방법']}
            rows={[
              ['로컬 저장 앨범 및 사진 데이터', '이용자가 직접 삭제할 때까지', '앱 내 삭제 기능 또는 앱 삭제 시 전체 삭제'],
              ['앱 설정 데이터 (AsyncStorage)', '앱 삭제 시 자동 삭제', '앱 삭제'],
              ['EXIF 메타데이터', '해당 사진 삭제 시 함께 삭제', '사진 삭제 또는 앱 삭제'],
            ]}
          />
          <InfoBox>
            본 앱 운영자는 이용자의 개인정보를 별도 서버에 저장하지 않으므로, 운영자 측 보유 기간은 해당 없습니다.
          </InfoBox>
        </Section>

        {/* 제5조 */}
        <Section title="제5조 (개인정보의 제3자 제공)">
          <BodyText>
            현재 버전에서는 이용자의 개인정보를 <BoldText>어떠한 제3자에게도 제공하지 않습니다.</BoldText> 모든 데이터는 이용자 기기 내부에서만 처리됩니다.
          </BodyText>
        </Section>

        {/* 제6조 */}
        <Section title="제6조 (이용자 및 법정대리인의 권리·의무)">
          <BodyText>이용자(및 만 14세 미만 아동의 경우 법정대리인)는 다음 권리를 행사할 수 있습니다.</BodyText>
          <NumberedList items={[
            '열람권: 앱 내 저장된 개인정보 확인',
            '정정·삭제권: 앱 내 편집/삭제 기능을 통한 직접 처리',
            '처리 정지권: 앱 삭제를 통한 처리 전면 중단',
          ]} />
          <InfoBox>
            본 앱은 로컬 전용 구조이므로, 운영자에게 별도 열람·삭제 요청 없이 이용자가 직접 앱 내에서 모든 데이터를 관리할 수 있습니다.
          </InfoBox>
        </Section>

        {/* 제7조 */}
        <Section title="제7조 (아동의 개인정보 보호에 관한 특별 조항)">
          <BodyText>
            본 앱은 아이 성장 기록, 가족 추억 사진 등 <BoldText>아동의 이미지 및 개인정보를 처리할 수 있는 특성상</BoldText> 다음 사항을 특별히 고지합니다.
          </BodyText>
          <SubTitle text="아동 사진의 로컬 처리" />
          <BulletList items={[
            '아동 사진을 포함한 모든 데이터는 기기 내부에서만 처리됩니다.',
            '운영자는 아동 사진에 접근하거나 수집하지 않습니다.',
          ]} />
          <SubTitle text="만 14세 미만 아동 이용자" />
          <BodyText>
            만 14세 미만의 아동이 직접 앱을 사용하는 경우, 법정대리인의 동의 하에 사용하여야 합니다.
          </BodyText>
        </Section>

        {/* 제8조 */}
        <Section title="제8조 (접근 권한 안내)">
          <SubTitle text="필수 권한" />
          <TableBlock
            headers={['권한', '처리 목적', '거부 시 영향']}
            rows={[
              ['사진/미디어 라이브러리 접근', '기기 내 사진 불러오기', '앱 핵심 기능 이용 불가'],
              ['카메라', '앱 내 사진 촬영', '촬영 기능만 이용 불가'],
            ]}
          />
          <SubTitle text="선택적 권한" />
          <TableBlock
            headers={['권한', '처리 목적', '거부 시 영향']}
            rows={[
              ['위치 정보 (EXIF 기반)', '사진 촬영 위치 표시\n(기기 카메라가 수집한 정보 활용)', '위치 기반 정렬 기능 이용 불가'],
              ['알림', '앱 내 알림 표시', '알림 기능만 이용 불가'],
            ]}
          />
          <InfoBox>
            EXIF 위치 정보 고지: 기기 카메라로 촬영된 사진에는 GPS 좌표가 포함될 수 있습니다. 이 정보는 기기 내부에서만 처리되며 외부로 전송되지 않습니다.
          </InfoBox>
        </Section>

        {/* 제9조 */}
        <Section title="제9조 (PDF 파일 생성 및 공유)">
          <BodyText>이용자가 생성하는 PDF 파일에는 사진, 앨범 정보 등 개인정보가 포함될 수 있습니다.</BodyText>
          <BulletList items={[
            'PDF 생성: 기기 내부에서만 처리됩니다.',
            'PDF 공유: 이용자가 직접 외부 앱(메시지, 이메일 등)으로 공유하는 행위는 해당 앱의 개인정보처리방침이 적용됩니다. 당사는 이에 대한 책임을 지지 않습니다.',
            '공유 전 주의: PDF 내 아동 사진, EXIF 위치 정보 포함 여부를 확인하시기 바랍니다.',
          ]} />
        </Section>

        {/* 제10조 */}
        <Section title="제10조 (개인정보의 안전성 확보 조치)">
          <SubTitle text="기술적 조치" />
          <BulletList items={[
            '모든 데이터는 이용자 기기 내 샌드박스 환경에 저장되어 타 앱이 접근할 수 없습니다.',
            'iOS: 앱 컨테이너 내 암호화 저장 (기기 패스코드 연동)',
            'Android: 내부 저장소 접근 제한 및 Android Keystore 활용',
          ]} />
          <SubTitle text="관리적 조치" />
          <BulletList items={[
            '당사 직원은 이용자 기기 데이터에 접근할 수 없는 구조입니다.',
          ]} />
        </Section>

        {/* 제11조 */}
        <Section title="제11조 (개인정보 보호책임자)">
          <TableBlock
            headers={['구분', '내용']}
            rows={[
              ['책임자', 'SNAPTAIL 개인정보 보호 담당자'],
              ['이메일', 'charisro.biz@gmail.com'],
              ['처리 기간', '접수 후 10영업일 이내 회신'],
            ]}
          />
          <BodyText>
            이용자는 개인정보 보호와 관련된 모든 불만·문의를 위 담당자에게 접수하실 수 있습니다.{'\n'}
            추가로 아래 기관에도 피해구제를 신청하실 수 있습니다.
          </BodyText>
          <View style={styles.agencyBox}>
            <AgencyRow name="개인정보 분쟁조정위원회" info="www.kopico.go.kr  /  1833-6972" />
            <AgencyRow name="한국인터넷진흥원(KISA) 개인정보침해신고센터" info="privacy.kisa.or.kr  /  118" />
            <AgencyRow name="경찰청 사이버수사국" info="ecrm.cyber.go.kr" />
          </View>
        </Section>

        {/* 제12조 */}
        <Section title="제12조 (개인정보처리방침의 변경)">
          <BodyText>
            본 방침은 관련 법령, 지침, 서비스 변경사항에 따라 개정될 수 있습니다.
          </BodyText>
          <BulletList items={[
            '중요한 변경(제3자 제공 추가 등): 앱 내 팝업 및 시행 7일 전 고지',
            '일반 변경: 앱 내 공지 및 시행 7일 전 고지',
          ]} />
        </Section>

        {/* 시행일 */}
        <View style={styles.effectiveBox}>
          <Text style={styles.effectiveText}>본 개인정보처리방침은 2026년 3월 8일부터 시행됩니다.</Text>
          <Text style={styles.companyText}>SNAPTAIL</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── 하위 컴포넌트 ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

function BoldText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.boldText}>{children}</Text>;
}

function SubTitle({ text }: { text: string }) {
  return <Text style={styles.subTitle}>{text}</Text>;
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <View style={styles.listBlock}>
      {items.map((item, i) => (
        <View key={i} style={styles.listRow}>
          <Text style={styles.listNum}>{i + 1}.</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.listBlock}>
      {items.map((item, i) => (
        <View key={i} style={styles.listRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name="information-circle-outline" size={15} color={COLORS.purple} style={{ marginRight: 6, marginTop: 1 }} />
      <Text style={styles.infoBoxText}>{children}</Text>
    </View>
  );
}

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <View style={styles.table}>
      {/* 헤더 행 */}
      <View style={[styles.tableRow, styles.tableHeader]}>
        {headers.map((h, i) => (
          <Text key={i} style={[styles.tableCell, styles.tableHeaderText, { flex: i === 0 ? 1.2 : 1 }]}>{h}</Text>
        ))}
      </View>
      {/* 데이터 행 */}
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.tableRow, ri % 2 === 1 && styles.tableRowAlt]}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[styles.tableCell, styles.tableCellText, { flex: ci === 0 ? 1.2 : 1 }]}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function AgencyRow({ name, info }: { name: string; info: string }) {
  return (
    <View style={styles.agencyRow}>
      <Ionicons name="chevron-forward" size={13} color={COLORS.purple} style={{ marginRight: 6, marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.agencyName}>{name}</Text>
        <Text style={styles.agencyInfo}>{info}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPink },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3E8FF', zIndex: 10,
    gap: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextBox: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  body: { padding: 16 },

  /* 서문 카드 */
  introCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 20,
    shadowColor: COLORS.pink, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  introGradient: { padding: 20 },
  introRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  introTitle: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1, lineHeight: 20 },
  introText: { fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 20 },

  /* 섹션 */
  section: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20, marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.purple,
    backgroundColor: 'rgba(139,92,246,0.06)',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.1)',
  },
  sectionBody: { padding: 14, gap: 8 },

  /* 텍스트 */
  bodyText: { fontSize: 13, color: COLORS.text, lineHeight: 22 },
  boldText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  subTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    marginTop: 4, marginBottom: 2,
  },

  /* 목록 */
  listBlock: { gap: 6, marginTop: 4 },
  listRow: { flexDirection: 'row', gap: 6 },
  listNum: { fontSize: 13, color: COLORS.purple, fontWeight: '700', minWidth: 18 },
  bullet: { fontSize: 14, color: COLORS.purple, minWidth: 14 },
  listText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 20 },

  /* 안내 박스 */
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderRadius: 12, padding: 12, marginTop: 4,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },
  infoBoxText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  /* 테이블 */
  table: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableHeader: { backgroundColor: 'rgba(139,92,246,0.08)' },
  tableCell: { padding: 10, justifyContent: 'center' },
  tableHeaderText: {
    fontSize: 12, fontWeight: '700', color: COLORS.purple, lineHeight: 16,
  },
  tableCellText: { fontSize: 12, color: COLORS.text, lineHeight: 18 },

  /* 기관 정보 */
  agencyBox: { gap: 8, marginTop: 6 },
  agencyRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.04)',
    borderRadius: 10, padding: 10,
  },
  agencyName: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  agencyInfo: { fontSize: 11, color: COLORS.textSecondary },

  /* 시행일 */
  effectiveBox: {
    alignItems: 'center', paddingVertical: 20,
    marginTop: 6,
  },
  effectiveText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  companyText: { fontSize: 16, fontWeight: '800', color: COLORS.purple },
});
